const { getImageData, getPredictionData, getAnalysisData, uploadImage, predictImage } = require('./handler');

const routes = [
    {
        method: 'POST',
        path: '/upload',
        options: {
            payload: {
                maxBytes: 10485760, // Maksimum ukuran file 10MB
                output: 'stream', // Output sebagai stream
                parse: true, // Parse payload
                multipart: true, // Izinkan multipart
            },
        },
        handler: async (request, h) => {
            const { payload } = request;
            console.log("Received file payload:", payload.file.hapi.filename);
        
            if (!payload.file) {
                return h.response({ message: 'File tidak ditemukan' }).code(400);
            }
        
            try {
                const imageDataWithPrediction = await uploadImage(payload.file);
                return h.response(imageDataWithPrediction).code(200);
            } catch (error) {
                console.error('Error uploading image:', error);
                return h.response({ error: 'Failed to upload image' }).code(500);
            }
        },
    },        
    {
        method: 'GET',
        path: '/images/{imageId}',
        handler: async (request, h) => {
            const imageId = request.params.imageId;
            try {
                const imageDoc = await getImageData(imageId);
                if (imageDoc.error) {
                    return h.response({ message: 'Image not found' }).code(404);
                }
                return h.response(imageDoc).code(200);
            } catch (error) {
                console.error('Error fetching image data:', error);
                return h.response({ error: 'Error fetching image data' }).code(500);
            }
        }
    },
    {
        method: 'POST', // Menambahkan rute POST untuk prediksi gambar
        path: '/predict',
        handler: async (request, h) => {
            const { imageId } = request.payload; // Mengambil imageId dari payload
            try {
                const predictionResult = await predictImage(imageId);
                return h.response(predictionResult).code(200);
            } catch (error) {
                console.error('Error predicting image:', error);
                return h.response({ error: 'Failed to predict image' }).code(500);
            }
        }
    },
    {
        method: 'GET',
        path: '/predictions/{predictionId}',
        handler: async (request, h) => {
            const predictionId = request.params.predictionId;
            try {
                const predictionData = await getPredictionData(predictionId);
                if (predictionData.error) {
                    return h.response(predictionData).code(404);
                }
                return h.response(predictionData).code(200);
            } catch (error) {
                console.error('Get prediction error:', error);
                return h.response({ error: 'Failed to get prediction data' }).code(500);
            }
        },
    },
    {
        method: 'GET',
        path: '/analysis/{predictionLabel}', // Mengubah analysisId menjadi predictionLabel
        handler: async (request, h) => {
            const predictionLabel = request.params.predictionLabel; // Mengambil predictionLabel dari parameter
            try {
                const analysisData = await getAnalysisData([predictionLabel]); // Memanggil fungsi dengan array
                if (analysisData.error) {
                    return h.response(analysisData).code(404);
                }
                return h.response(analysisData).code(200);
            } catch (error) {
                console.error('Get analysis error:', error);
                return h.response({ error: 'Failed to get analysis data' }).code(500);
            }
        },
    },
];

module.exports = routes;