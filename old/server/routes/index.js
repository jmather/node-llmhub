const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Welcome to the LLMHub API!' });
});

router.use('/models', require('./models.js'));
router.use('/engines', require('./engines.js'));

module.exports = router;