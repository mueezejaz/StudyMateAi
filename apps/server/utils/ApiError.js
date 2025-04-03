class ApiError extends Error {
    constructor(StatusCode,message = "some thing went wrong",error =[]){
       super(message)
       this.statusCode = StatusCode
       this.success = false
       this.message = message 
    }
}
export default  ApiError
