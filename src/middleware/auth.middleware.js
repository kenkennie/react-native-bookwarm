import jwt from 'jsonwebtoken';
import User  from '../models/User.js';

const protectRoute = async (req, res, next) => {
    // get token from headers
    const token = req.headers.authorization?.split(' ')[1];
        
    if (!token) {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
    }
    
    try {
        // verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // find user by id from token
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user; // attach user to request object

        next();
    } catch (error) {
        console.log("Authentication error:", error.message);    
        res.status(401).json({ message: 'Token is not valid' });
    }
}
export default protectRoute;