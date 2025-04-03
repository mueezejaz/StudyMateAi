const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    const responseMessage = statusCode >= 500 ? "Internal Server Error" : message;
    console.log(err.message,err)
    res.status(statusCode).json({
        success: false,
        message: responseMessage,
        errors: err.errors || [], // Send errors only for specific cases, not general server failures
    });
};

export default errorHandler;


