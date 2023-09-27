const jwt = require ('jsonwebtoken');

module.exports = function(req, res, next) {
    const token = req.header('Authorization')

    if(!token){
        return res.status(401).send({
            errorType: "Token missing",
            statusCode: 401,
            message:"Token needed"
        });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        req.user.role = verified.role;
        req.user._id = verified._id;
        
        next()
    } catch (error) {
        res.status(403).send({
            errorType:"Token error",
            statusCode: 403,
            message:"Token not valid or expired",
        })
    }
}