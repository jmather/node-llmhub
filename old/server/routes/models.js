const express = require('express');
const router = express.Router();

// Dummy data
const models = [
    { id: 1, name: 'Model A', quantization: 'Q5_K_M' },
    { id: 2, name: 'Model B', quantization: 'Q4_1' },
];

// List all models
router.get('/', (req, res) => {
    res.json(models);
});

module.exports = router;