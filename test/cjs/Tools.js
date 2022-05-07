const { NiceError } = require('../../dist/cjs/NiceError.js')

// 把一段代码放进 try catch 执行
module.exports.tryCatch = function(func) {
    try {
        func()
    }
    catch(err) {
        console.log(err.fullMessage())
        console.log(err.fullInfo())
        console.log(err.fullStack())
    }
}

// 捕获错误并比较其信息
module.exports.assertError = function(func, message) {
    try {
        if (func()) throw new NiceError('No Error Occurred')
    }
    catch(err) {
        expect(err.fullMessage()).toEqual(message)
    }
}

// 比较
module.exports.assertEquals = function(a, b) {
    expect(a).toEqual(b)
}
