import {assertEquals} from "https://deno.land/std@0.106.0/testing/asserts.ts";
import { NiceError } from "../../mod.ts";

// 把一段代码放进 try catch 执行
export function tryCatch(func: Function): void {
    try {
        func()
    }
    catch(err) {
        console.log(err.fullMessage())
        console.log(err.fullInfo())
    }
}

// 捕获错误并比较其信息
export function assertError(func: Function, message:string): void {
    try {
        if (func()) throw new NiceError('No Error Occurred')
    }
    catch(err) {
        assertEquals(err.fullMessage(), message)
    }
}

export const typeChecker = {
    isString(target: any) {
        return typeof target === 'string'
    },
    isBool(target: any) {
        return typeof target === 'boolean'
    },
    isFunction(target: any) {
        return typeof target === 'function'
    },
    isInteger(target: any) {
        return Number.isSafeInteger(target)
    },
    isNumber(target: any) {
        return (typeof target === 'number' && !Number.isNaN(target))
    },
    isArray(target: any) {
        return target instanceof Array
    },
    isDate(target: any) {
        return target instanceof Date
    },
    isObject(target: any) {
        return Object.prototype.toString.call(target) === '[object Object]'
    },
}