import jwt from "jsonwebtoken";

// লগইন করা ইউজার ভেরিফাই করার মিডলওয়্যার
export const verifyAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No authorization token provided.",
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_pos_jwt_secret");

        req.user = decoded; // রিকোয়েস্টে ডিকোডেড ইউজার ডাটা যুক্ত করা
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired session token.",
        });
    }
};

// শুধুমাত্র নির্দিষ্ট রোল চেক করার মিডলওয়্যার (যেমন: শুধু Admin)
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You do not have permission to perform this action.",
            });
        }
        next();
    };
};