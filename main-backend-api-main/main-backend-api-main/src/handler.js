const { Storage } = require('@google-cloud/storage');
const { Firestore } = require('@google-cloud/firestore');
const { nanoid } = require('nanoid');
const axios = require('axios'); // Pastikan untuk menginstal axios jika belum ada

const path = require('path');
const pathKey = '/account-backend/secret-backend';


// Konfigurasi
const config = require('../config.json');

// Inisialisasi
const storage = new Storage({
    projectId: config.projectId,
    keyFilename: pathKey
});
const bucketName = config.bucketName;

const firestore = new Firestore({
    projectId: config.projectId, 
    keyFilename: pathKey
});

// Fungsi untuk mengunggah gambar
async function uploadImage(file) {
    if (!file || !file.hapi || !file.hapi.filename) {
        throw new Error('File tidak valid atau nama file tidak ditemukan');
    }

    const originalName = file.hapi.filename;
    const fileExtension = path.extname(originalName);
    const fileName = `${nanoid()}${fileExtension}`;

    const fileBuffer = await new Promise((resolve, reject) => {
        const buffers = [];
        file.pipe(require('stream').Writable({
            write(chunk, encoding, callback) {
                buffers.push(chunk);
                callback();
            },
            final(callback) {
                resolve(Buffer.concat(buffers));
                callback();
            }
        }));
    });

    try {
        // Upload image ke Cloud Storage
        const bucket = storage.bucket(bucketName);
        const fileBlob = bucket.file(fileName);
        await fileBlob.save(fileBuffer);
        console.log('Image uploaded successfully:', fileName);

        // Simpan metadata ke Firestore menggunakan doc(fileName).set()
        try {
            console.log('Generated fileName:', fileName);
            const docRef = firestore.collection('images').doc(fileName);
            console.log('Firestore document reference created:', docRef.path);
        
            await docRef.set({
                id: fileName,
                originalName: originalName,
                createdAt: Firestore.Timestamp.now(),
            });
        
            console.log('Document added to Firestore:', fileName);
        } catch (error) {
            console.error('Error uploading image or writing to Firestore:', error.message || error.code, error);
            throw error;
        }

        // Panggil fungsi predictImage untuk mendapatkan prediksi
        const imageDataWithPrediction = await predictImage(fileName);

        return imageDataWithPrediction;
    } catch (error) {
        console.error('Error uploading image or writing to Firestore:', error);
        throw error;
    }
}

// Fungsi untuk melakukan prediksi
async function predictImage(fileName) {
    try {
        // Kirim request ke backend machine learning service untuk melakukan prediksi
        const predictionResponse = await axios.post('https://ml-backend-900098332914.asia-southeast1.run.app/predict', {
            imageId: fileName
        });

        // Ambil label hasil prediksi
        const predictionLabel = predictionResponse.data.label;

        // Proses prediksi dengan label yang didapat
        const imageDataWithPrediction = await processPrediction(fileName, predictionLabel);

        return imageDataWithPrediction; // Kembalikan data gambar dengan informasi prediksi
    } catch (error) {
        console.error('Error during prediction:', error);
        throw error;
    }
}

// Fungsi untuk mendapatkan data gambar
async function getImageData(imageId) {
    const imageDoc = await firestore.collection('images').doc(imageId).get();
    if (!imageDoc.exists) {
        return { error: 'Image not found' };
    }
    const imageData = imageDoc.data();
    return imageData;
}

// Fungsi untuk mendapatkan data prediksi
async function getPredictionData(predictionId) {
    const predictionDoc = await firestore.collection('predictions').doc(predictionId).get();
    if (!predictionDoc.exists) {
        return { error: 'Prediction not found' };
    }
    const predictionData = predictionDoc.data();
    return predictionData;
}

// Fungsi untuk mendapatkan data analisis
async function getAnalysisData(predictionLabel) {
    const docId = predictionLabel[0].trim(); // Ambil ID dokumen dari predictionLabel
    const analysisDoc = await firestore.collection('paddy-disease').doc(docId).get(); // Ambil dokumen berdasarkan ID

    if (!analysisDoc.exists) {
        console.error('Analysis not found for document ID:', docId);
        return { error: 'Analysis not found for this prediction label' };
    }

    // Ambil data analisis dari dokumen
    const analysisData = analysisDoc.data();
    
    // Kembalikan data analisis dan predictionLabel
    return {
        predictionLabel: predictionLabel[0], // Kembalikan predictionLabel
        analysis: analysisData // Kembalikan data analisis
    };
}

// Fungsi untuk memproses prediksi
async function processPrediction(imageId, predictionLabel) {
    // Simpan hasil prediksi ke Firestore
    const predictionRef = await firestore.collection('predictions').add({
        label: predictionLabel, // Pastikan ini adalah array
        imageId: imageId
    });

    const predictionId = predictionRef.id; // Ambil ID dokumen prediksi

    // Panggil getAnalysisData untuk mendapatkan data analisis berdasarkan label prediksi
    const analysisData = await getAnalysisData(predictionLabel);
    if (analysisData.error) {
        // Handle kasus ketika tidak ditemukan data analisis
        return { error: analysisData.error };
    }

    // Update dokumen gambar dengan ID analisis
    await firestore.collection('images').doc(imageId).update({
        predictionId: predictionId,
        analysis: analysisData.analysis
    });

    // Kembalikan data gambar dan analisis bersama dengan predictionLabel
    const imageData = await getImageData(imageId);
    imageData.analysis = analysisData.analysis;
    imageData.predictionLabel = analysisData.predictionLabel; // Tambahkan predictionLabel ke hasil
    return imageData;
}

// Ekspor fungsi-fungsi yang ingin digunakan di routes.js
module.exports = {
    uploadImage,
    getImageData,
    getPredictionData,
    getAnalysisData,
    processPrediction,
    predictImage
};