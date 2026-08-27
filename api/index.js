const app = require('../index');

module.exports = async (req, res) => {
  try {
    return await app(req, res);
  } catch (error) {
    console.error('Serverless Handler Error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred'
      });
    }
  }
};
