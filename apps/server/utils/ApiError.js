class ApiError extends Error {
    constructor(StatusCode,message = "some thing went wrong",error =[]){
       super(message)
       this.StatusCode = StatusCode
       this.success = false
       this.message = message 
    }
}
export default  ApiError
