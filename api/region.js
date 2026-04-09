module.exports = async (req, res) => {
  try {
    const { uid } = req.query;
    return res.status(200).json({
      ok: true,
      uid: uid || null,
      message: 'region route is alive'
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'unknown error'
    });
  }
};
