/**
 * JSON Schema Validator
 */

// 这里为了编译后兼容 nodejs 环境所以直接拷贝了 NiceError.ts 的源码
// 如果在 Deno 环境下可以直接 import 远程源文件 https://deno.land/x/fsp_nice_error@1.1.0/src/NiceError.ts
import NiceError from './NiceError.ts'

// 可用类型
export enum SchemaTypes {
    UNSET = 'unset',
    ANY = 'any',
    STRING = 'string',
    BOOLEAN = 'boolean',
    INTEGER = 'integer',
    NUMBER = 'number',
    DATE = 'date',
    FUNCTION = 'function',
    ENUM = 'enum',
    REGEXP = 'regexp',
    OBJECT = 'object',
    ARRAY = 'array',
    QUOTABLE = 'quotable',
    MULTIPLE = 'multiple'
}

// 错误类型
enum ErrorType {
    SCHEMA_TYPE_ERROR = 'SchemaTypeError',
    VALUE_TYPE_ERROR = 'ValueTypeError',
    GET_PROPERTY_VALUE_FAILED = 'GetPropertyValueFailed',
    SCHEMA_DEF_ERROR = 'SchemaDefError',
    TARGET_MISSING_ERROR = 'TargetMissingError',
    BOOLEAN_VALIDATION_ERROR = 'BooleanValidationError',
    TARGET_TYPE_ERROR = 'TargetTypeError',
    FUNCTION_VALIDATION_ERROR = 'FunctionValidationError',
    VALIDATION_ERROR = 'ValidationError',
    RESTRICTION_ERROR = 'RestrictionError',
    STRING_VALIDATION_ERROR = 'StringValidationError',
    INTEGER_VALIDATION_ERROR = 'IntegerValidationError',
    NUMBER_VALIDATION_ERROR = 'NumberValidationError',
    DATE_VALIDATION_ERROR = 'DateValidationError',
    ENUM_VALIDATION_ERROR = 'EnumValidationError',
    REGEXP_VALIDATION_ERROR = 'RegExpValidationError',
    OBJECT_VALIDATION_ERROR = 'ObjectValidationError',
    ARRAY_VALIDATION_ERROR = 'ArrayValidationError',
    QUOTABLE_VALIDATION_ERROR = 'QuotableValidationError',
    MULTIPLE_VALIDATION_ERROR = 'MultipleValidationError',
    KEY_MISSING_ERROR = 'KeyMissingError',
    INVALID_PROPERTY_ERROR = 'InvalidPropertyError',
}

// 错误说明
enum ErrorInfo {
    INVALID_SCHEMA_TYPE_NAME = 'Invalid Schema Type Name',
    VALUE_TYPE_MISMATCH = 'Value and Type Mismatch',
    VALIDATION_FAILED = 'Validation Failed',
    INVALID_SCHEMA_KEY = 'Invalid Schema Key',
    INVALID_SCHEMA_RULE = 'Invalid Schema Rule',
    INVALID_SCHEMA_DEF = 'Invalid Schema Definition',
    GET_PROPERTY_VALUE_FAILED = 'Get Property Value Failed',
    TARGET_REQUIRED = 'Target Required',
    WRONG_TYPE = 'Wrong Type',
    SCHEMA_KEY_REQUIRED = 'Schema Key Required',
    STRING_VALIDATION_FAILED = 'String Validation Failed',
    INTEGER_VALIDATION_FAILED = 'Integer Validation Failed',
    NUMBER_VALIDATION_FAILED = 'Number Validation Failed',
    BOOLEAN_VALIDATION_FAILED = 'Boolean Validation Failed',
    DATE_VALIDATION_FAILED = 'Date Validation Failed',
    ENUM_VALIDATION_FAILED = 'Enum Validation Failed',
    FUNCTION_VALIDATION_FAILED = 'Function Validation Failed',
    REGEXP_VALIDATION_FAILED = 'RegExp Validation Failed',
    REGEXP_RESTRICTION_NOT_SATISFIED = 'RegExp Restriction Not Satisfied',
    OBJECT_VALIDATION_FAILED = 'Object Validation Failed',
    PROPERTIES_VALIDATION_FAILED = 'Properties Validation Failed',
    VALUES_VALIDATION_FAILED = 'Values Validation Failed',
    ARRAY_VALIDATION_FAILED = 'Array Validation Failed',
    QUOTABLE_VALIDATION_FAILED = 'Quotable Validation Failed',
    MULTIPLE_VALIDATION_FAILED = 'Multiple Validation Failed',
    ITEMS_VALIDATION_FAILED = 'Items Validation Failed',
    ADDITIONAL_ITEMS_NOT_ALLOWED = 'Additional Items Not Allowed',
    INVALID_QUOTABLE_SCHEMA_KEY = 'Invalid Quotable Schema Key',
    NOT_VALID_ENUM_ITEM = 'Not Valid Enum Item',
    NO_ONE_MATCHES = 'No One Matches',
    ITEMS_RESTRICTION_NOT_SATISFIED = 'Items Restriction Not Satisfied',
    PROPERTIES_RESTRICTION_NOT_SATISFIED = 'Properties Restriction Not Satisfied',
    PROPERTY_NOT_ALLOWED = 'Property Not Allowed',
    RESTRICTION_NOT_SATISFIED = 'Restriction Not Satisfied',
}

// 类型基类
export class JType {
    type: SchemaTypes = SchemaTypes.UNSET
    constructor(json: { [key: string]: any }, path?: string[]) {
        let chain = (path === undefined) ? [] : JSON.parse(JSON.stringify(path))
        chain.push(`JType:constructor`)
        Object.assign(this,json)
        // 检查类型是否有效
        if (Object.values(SchemaTypes).indexOf(this.type) < 0 || this.type === SchemaTypes.UNSET) {
            throw new NiceError(ErrorInfo.INVALID_SCHEMA_TYPE_NAME + ` - [${this.type}]`, {
                name: ErrorType.SCHEMA_DEF_ERROR,
                chain: chain,
                info: {
                    bomb: true
                }
            })
        }
    }
}

// 定义兼容 ts 和 js 的类型
// 类型对象可以是一个类型的类，或者一个描述类型的 JSON
type schemaType = JSchemaBase | { [key: string]: any }
// 被引用的类型对象可以是一个包含多组键值对的对象，其中值可以是类型对象或者一个描述类型的 JSON
type schemaRefType = { [key: string]: JSchemaBase } | { [key: string]: { [key: string]: any } }

// 为构造函数创建 chain 变量
function _createJSchemaBaseChain(path?: string[]) {
    let res = (path === undefined) ? [] : JSON.parse(JSON.stringify(path))
    res.push(`JSchemaBase:constructor`)
    return res
}

// JSchema 基类
export class JSchemaBase extends JType {
    required: boolean = false
    constructor(json: { [key: string]: any }, path?: string[]) {
        // 执行 JType 的类型检查
        super(json, _createJSchemaBaseChain(path))
        // 将参数拷贝至实例（这里不做输入参数校验，具体校验到各个派生类的构造函数中去做）
        Object.assign(this,json)
    }
    // 下面是所有派生类都可能用到的公用方法
    // 检查是否有某个属性并且其值不为 undefined
    public hasProp(key: string) : boolean {
        // 注意这里不仅要检查是否有这个 key 还要看它是否 undefined
        return Object.keys(this).indexOf(key) >= 0 && this[key as keyof JSchemaBase] !== undefined
    }
    // 返回某个属性的值
    // refs 参数是可能会被引用的 schema 池
    public getValue(key: string, type: SchemaTypes, refs: schemaRefType, path?: string[]) : any {
        // 由于类实例有可能是用客户端 json 构造出来的，因此在运行时无法保证其属性字段类型正确
        // 所以这里要把类型检查做了
        let chain = !path ? [] : JSON.parse(JSON.stringify(path))
        chain.push(`getValue:${key}`)
        try {
            const value = this[key as keyof JSchemaBase]
            const sType = {
                type: type,
                required: true
            }
            const res = vjs(value, sType, refs, chain)
            if (res) return value
            else throw new NiceError(ErrorInfo.VALUE_TYPE_MISMATCH + ` - [${key}]`, {
                name: ErrorType.VALUE_TYPE_ERROR,
                chain,
                info: {
                    bomb: true
                }
            })
        }
        catch (err) {
            throw new NiceError(ErrorInfo.GET_PROPERTY_VALUE_FAILED + ` - [${key}]`, {
                name: ErrorType.GET_PROPERTY_VALUE_FAILED,
                chain,
                cause: err
            })
        }
    }
}

// 扫描是否有非法属性
function scanInputKeys(keys: string[], json: { [key: string]: any }, path?: string[]) : void {
    let chain = (path === undefined) ? [] : JSON.parse(JSON.stringify(path))
    const jsonKeys = Object.keys(json)
    for (let i=0; i<jsonKeys.length; i++) {
        const key = jsonKeys[i]
        if (keys.indexOf(key) < 0) {
            chain.push(`scanInputKeys:${key}`)
            throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY + ` - [${key}]`, {
                name: ErrorType.SCHEMA_DEF_ERROR,
                chain: chain,
                info: {
                    bomb: true
                }
            })
        }
    }
}

// 检查 json 数据结构的主函数
export function vjs(target: any, schema: schemaType, refs?: schemaRefType, path?: string[]) : boolean {
    let chain = (path === undefined) ? [] : JSON.parse(JSON.stringify(path))
    if (chain.length === 0) chain.push(`vjs:root`)
    chain.push(`validate:${schema.type}`)
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        const schemaObj = new JSchemaBase(schema,chain)
        // 先判断是否可以为空
        if (typeof schemaObj.required === 'boolean') {
            // 不可为空
            if (schemaObj.required === true) {
                if (target === undefined || target === null) {
                    chain.push(`required`)
                    throw new NiceError(ErrorInfo.TARGET_REQUIRED + `, but we got '${JSON.stringify(target)}'`, {
                        name: ErrorType.TARGET_MISSING_ERROR,
                        chain: chain
                    })
                }
            }
            // 可为空
            else {
                if (target === undefined || target === null) return true
            }
        }
        else {
            // required 定义错误
            chain.push(`required`)
            throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY + `, should be a boolean, but we got '${JSON.stringify(schemaObj.required)}'`, {
                name: ErrorType.SCHEMA_DEF_ERROR,
                chain: chain,
                info: {
                    bomb: true
                }
            })
        }
        // 根据 type 来调用相应的校验
        // 因为初始化 schemaObj 的时候已经进行了 type 校验，所以不会出现非法类型
        switch (schemaObj.type) {
            // any 类型
            case SchemaTypes.ANY: {
                return true
            }
            // string 类型
            case SchemaTypes.STRING: {
                return validateString(target,schema,refs||{},chain)
            }
            // bool 类型
            case SchemaTypes.BOOLEAN: {
                // 类型错误
                if (typeof target !== 'boolean') {
                    throw new NiceError(ErrorInfo.BOOLEAN_VALIDATION_FAILED, {
                        name: ErrorType.BOOLEAN_VALIDATION_ERROR,
                        chain,
                        cause: new NiceError(ErrorInfo.WRONG_TYPE, {
                            name: ErrorType.TARGET_TYPE_ERROR,
                            chain                     
                        })
                    })
                }
                return true
            }
            // integer 类型
            case SchemaTypes.INTEGER: {
                return validateInteger(target,schema,refs||{},chain)
            }
            // number 类型
            case SchemaTypes.NUMBER: {
                return validateNumber(target,schema,refs||{},chain)
            }
            // date 类型
            case SchemaTypes.DATE: {
                return validateDate(target,schema,refs||{},chain)
            }
            // function 类型
            case SchemaTypes.FUNCTION: {
                // 类型错误
                if (typeof target !== 'function') {
                    throw new NiceError(ErrorInfo.FUNCTION_VALIDATION_FAILED, {
                        name: ErrorType.FUNCTION_VALIDATION_ERROR,
                        chain,
                        cause: new NiceError(ErrorInfo.WRONG_TYPE, {
                            name: ErrorType.TARGET_TYPE_ERROR,
                            chain                       
                        })
                    })
                }
                return true
            }
            // enum 类型
            case SchemaTypes.ENUM: {
                return validateEnum(target,schema,refs||{},chain)
            }
            // 正则类型
            case SchemaTypes.REGEXP: {
                return validateRegExp(target,schema,refs||{},chain)
            }
            // object 类型
            case SchemaTypes.OBJECT: {
                return validateObject(target,schema,refs||{},chain)
            }
            // array 类型
            case SchemaTypes.ARRAY: {
                return validateArray(target,schema,refs||{},chain)
            }
            // quotable 类型
            case SchemaTypes.QUOTABLE: {
                return validateQuotable(target,schema,refs||{},chain)
            }
            // multiple 类型
            case SchemaTypes.MULTIPLE: {
                return validateMultiple(target,schema,refs||{},chain)
            }
        }
        return true
    }
    catch(err) {
        throw new NiceError(ErrorInfo.VALIDATION_FAILED, {
            name: ErrorType.VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}

// 定义 string 类型的 schema
class JStringSchema extends JSchemaBase {
    minLength?: number
    maxLength?: number
    constructor(json: { [key: string]: any }, path?: string[]) {
        super({ type: SchemaTypes.STRING }, path)
        // 字段校验
        let keys = Object.keys(this)
        // 转 js 后 Object.keys 方法返回的键名列表中不包括非必须属性，所以要手动加入，下同
        keys.push('minLength')
        keys.push('maxLength')
        scanInputKeys(keys, json, path)
        Object.assign(this, json)
    }
}

// 检验字符串
function validateString(target: any, schema: { [key: string]: any }, refs: schemaRefType, path: string[]) : boolean {
    let chain = JSON.parse(JSON.stringify(path))
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        const realSchema = new JStringSchema(schema,chain)
        // 类型正确
        if (typeof target === 'string') {
            // 是否满足值的约束
            let tof = true
            if (realSchema.hasProp('minLength') && realSchema.hasProp('maxLength') && realSchema.getValue('minLength',SchemaTypes.INTEGER,refs,path) > realSchema.getValue('maxLength',SchemaTypes.INTEGER,refs,path)) {
                chain.push(`minLength&maxLength`)
                throw new NiceError(ErrorInfo.INVALID_SCHEMA_RULE, {
                    name: ErrorType.SCHEMA_DEF_ERROR,
                    chain,
                    info: {
                        bomb: true
                    }
                })
            }
            if (realSchema.hasProp('minLength') && target.length < realSchema.getValue('minLength',SchemaTypes.INTEGER,refs,path)) tof = false
            if (realSchema.hasProp('maxLength') && target.length > realSchema.getValue('maxLength',SchemaTypes.INTEGER,refs,path)) tof = false
            if (tof === false) {
                chain.push(`minLength|maxLength`)
                throw new NiceError(ErrorInfo.RESTRICTION_NOT_SATISFIED, {
                    name: ErrorType.RESTRICTION_ERROR,
                    chain
                })
            }
            return true
        }
        // 类型错误
        else {
            throw new NiceError(ErrorInfo.WRONG_TYPE, {
                name: ErrorType.TARGET_TYPE_ERROR,
                chain
            })
        }
    }
    catch(err) {
        throw new NiceError(ErrorInfo.STRING_VALIDATION_FAILED, {
            name: ErrorType.STRING_VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}

// 定义 integer 类型的 schema
class JIntegerSchema extends JSchemaBase {
    min?: number
    max?: number
    constructor(json: { [key: string]: any }, path?: string[]) {
        super({ type: SchemaTypes.INTEGER }, path)
        // 字段校验
        let keys = Object.keys(this)
        keys.push('min')
        keys.push('max')
        scanInputKeys(keys, json, path)
        Object.assign(this, json)
    }
}

// 检验整型值
function validateInteger(target: any, schema: { [key: string]: any }, refs: schemaRefType, path: string[]) : boolean {
    let chain = JSON.parse(JSON.stringify(path))
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        const realSchema = new JIntegerSchema(schema,chain)
        // 类型正确
        if (Number.isSafeInteger(target)) {
            // 是否满足值的约束
            let tof = true
            if (realSchema.hasProp('min') && realSchema.hasProp('max') && realSchema.getValue('min',SchemaTypes.INTEGER,refs,path) > realSchema.getValue('max',SchemaTypes.INTEGER,refs,path)) {
                chain.push(`min&max`)
                throw new NiceError(ErrorInfo.INVALID_SCHEMA_RULE, {
                    name: ErrorType.SCHEMA_DEF_ERROR,
                    chain,
                    info: {
                        bomb: true
                    }
                })
            }
            if (realSchema.hasProp('min') && target < realSchema.getValue('min',SchemaTypes.INTEGER,refs,path)) tof = false
            if (realSchema.hasProp('max') && target > realSchema.getValue('max',SchemaTypes.INTEGER,refs,path)) tof = false
            if (tof === false) {
                chain.push(`min|max`)
                throw new NiceError(ErrorInfo.RESTRICTION_NOT_SATISFIED, {
                    name: ErrorType.RESTRICTION_ERROR,
                    chain
                })
            }
            return true
        }
        // 类型错误
        else throw new NiceError(ErrorInfo.WRONG_TYPE, {
            name: ErrorType.TARGET_TYPE_ERROR,
            chain
        })
    }
    catch(err) {
        throw new NiceError(ErrorInfo.INTEGER_VALIDATION_FAILED, {
            name: ErrorType.INTEGER_VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}

// 定义 number 类型的 schema
class JNumberSchema extends JSchemaBase {
    min?: number
    max?: number
    constructor(json: { [key: string]: any }, path?: string[]) {
        super({ type: SchemaTypes.NUMBER }, path)
        // 字段校验
        let keys = Object.keys(this)
        keys.push('min')
        keys.push('max')
        scanInputKeys(keys, json, path)
        Object.assign(this, json)
    }
}

// 检验整型值
function validateNumber(target: any, schema: { [key: string]: any }, refs: schemaRefType, path: string[]) : boolean {
    let chain = JSON.parse(JSON.stringify(path))
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        const realSchema = new JNumberSchema(schema,chain)
        // 类型正确
        if (typeof target === 'number' && !Number.isNaN(target)) {
            // 是否满足值的约束
            let tof = true
            if (realSchema.hasProp('min') && realSchema.hasProp('max') && realSchema.getValue('min',SchemaTypes.NUMBER,refs,path) > realSchema.getValue('max',SchemaTypes.NUMBER,refs,path)) {
                chain.push(`min&max`)
                throw new NiceError(ErrorInfo.INVALID_SCHEMA_RULE, {
                    name: ErrorType.SCHEMA_DEF_ERROR,
                    chain,
                    info: {
                        bomb: true
                    }
                })
            }
            if (realSchema.hasProp('min') && target < realSchema.getValue('min',SchemaTypes.NUMBER,refs,path)) tof = false
            if (realSchema.hasProp('max') && target > realSchema.getValue('max',SchemaTypes.NUMBER,refs,path)) tof = false
            if (tof === false) {
                chain.push(`min|max`)
                throw new NiceError(ErrorInfo.RESTRICTION_NOT_SATISFIED, {
                    name: ErrorType.RESTRICTION_ERROR,
                    chain
                })
            }
            return true
        }
        // 类型错误
        else throw new NiceError(ErrorInfo.WRONG_TYPE, {
            name: ErrorType.TARGET_TYPE_ERROR,
            chain
        })
    }
    catch(err) {
        throw new NiceError(ErrorInfo.NUMBER_VALIDATION_FAILED, {
            name: ErrorType.NUMBER_VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}

// 定义 date 类型的 schema
class JDateSchema extends JSchemaBase {
    min?: Date
    max?: Date
    constructor(json: { [key: string]: any }, path?: string[]) {
        super({ type: SchemaTypes.DATE }, path)
        // 字段校验
        let keys = Object.keys(this)
        keys.push('min')
        keys.push('max')
        scanInputKeys(keys, json, path)
        Object.assign(this, json)
    }
}

// 检验日期
function validateDate(target: any, schema: { [key: string]: any }, refs: schemaRefType, path: string[]) : boolean {
    let chain = JSON.parse(JSON.stringify(path))
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        const realSchema = new JDateSchema(schema,chain)
        // 类型正确
        if (target instanceof Date) {
            // 是否满足值的范围约束
            let tof = true
            if (realSchema.hasProp('min') && realSchema.hasProp('max') && realSchema.getValue('min',SchemaTypes.DATE,refs,path) > realSchema.getValue('max',SchemaTypes.DATE,refs,path)) {
                chain.push(`min&max`)
                throw new NiceError(ErrorInfo.INVALID_SCHEMA_RULE, {
                    name: ErrorType.SCHEMA_DEF_ERROR,
                    chain,
                    info: {
                        bomb: true
                    }
                })
            }
            if (realSchema.hasProp('min') && target < realSchema.getValue('min',SchemaTypes.DATE,refs,path)) tof = false
            if (realSchema.hasProp('max') && target > realSchema.getValue('max',SchemaTypes.DATE,refs,path)) tof = false
            if (tof === false) {
                chain.push(`min|max`)
                throw new NiceError(ErrorInfo.RESTRICTION_NOT_SATISFIED, {
                    name: ErrorType.RESTRICTION_ERROR,
                    chain
                })
            }
            return true
        }
        // 类型错误
        else throw new NiceError(ErrorInfo.WRONG_TYPE, {
            name: ErrorType.TARGET_TYPE_ERROR,
            chain
        })
    }
    catch(err) {
        throw new NiceError(ErrorInfo.DATE_VALIDATION_FAILED, {
            name: ErrorType.DATE_VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}

// 定义 enum 类型的 schema
class JEnumSchema extends JSchemaBase {
    items: Array<any> = []
    constructor(json: { [key: string]: any }, path?: string[]) {
        super({ type: SchemaTypes.ENUM }, path)
        // 字段校验
        let keys = Object.keys(this)
        scanInputKeys(keys, json, path)
        Object.assign(this, json)
        // 对 items 进行基本校验
        let chain = !path ? [] : JSON.parse(JSON.stringify(path))
        chain.push(`JEnumSchema:constructor`)
        if (json.items === undefined) {
            throw new NiceError(ErrorInfo.SCHEMA_KEY_REQUIRED + ` - [items]`, {
                name: ErrorType.KEY_MISSING_ERROR,
                chain
            })
        }
        else if (json.items instanceof Array) {
            if (json.items.length === 0) {
                throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY + ` - [items] must be a non-zero-item Array`, {
                    name: ErrorType.SCHEMA_DEF_ERROR,
                    chain,
                    info: {
                        bomb: true
                    }
                })
            }
        }
        else {
            throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY + ` - [items] must be an Array`, {
                name: ErrorType.SCHEMA_DEF_ERROR,
                chain,
                info: {
                    bomb: true
                }
            })
        }
    }
}

// 检验 Enum 类型
function validateEnum(target: any, schema: { [key: string]: any }, refs: schemaRefType, path: string[]) : boolean {
    let chain = JSON.parse(JSON.stringify(path))
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        const realSchema = new JEnumSchema(schema, chain)
        // 只要 target 等于数组中的任意值即可
        for (let i=0; i<realSchema.items.length; i++) {
            if (JSON.stringify(realSchema.items[i]) === JSON.stringify(target)) return true
        }
        chain.push(`items`)
        throw new NiceError(ErrorInfo.NOT_VALID_ENUM_ITEM + ` - '${JSON.stringify(target)}'`, {
            name: ErrorType.RESTRICTION_ERROR,
            chain
        })
    }
    catch(err) {
        throw new NiceError(ErrorInfo.ENUM_VALIDATION_FAILED, {
            name: ErrorType.ENUM_VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}

// 定义 enum 类型的 schema
class JRegExpSchema extends JSchemaBase {
    expression: RegExp = new RegExp('')
    constructor(json: { [key: string]: any }, path?: string[]) {
        super({ type: SchemaTypes.INTEGER }, path)
        // 字段校验
        let keys = Object.keys(this)
        scanInputKeys(keys, json, path)
        Object.assign(this, json)
        // 基本校验
        let chain = !path ? [] : JSON.parse(JSON.stringify(path))
        chain.push(`JRegExpSchema:constructor`)
        if (json.expression === undefined) {
            throw new NiceError(ErrorInfo.SCHEMA_KEY_REQUIRED + ` - [expression]`, {
                name: ErrorType.KEY_MISSING_ERROR,
                chain,
                info: {
                    bomb: true
                }
            })
        }
        else if (!(json.expression instanceof RegExp)) {
            throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY + ` - [expression] must be a RegExp`, {
                name: ErrorType.SCHEMA_DEF_ERROR,
                chain,
                info: {
                    bomb: true
                }
            })
        }
    }
}

// 检验正则表达式
function validateRegExp(target: any, schema: { [key: string]: any }, refs: schemaRefType, path: string) : boolean {
    let chain = JSON.parse(JSON.stringify(path))
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        const realSchema = new JRegExpSchema(schema,chain)
        // 是否满足值的约束
        let res = realSchema.expression.test(target)
        if (res === false) {
            chain.push(`expression`)
            throw new NiceError(ErrorInfo.REGEXP_RESTRICTION_NOT_SATISFIED + ` - '${JSON.stringify(target)}'`, {
                name: ErrorType.RESTRICTION_ERROR,
                chain
            })
        }
        return true
    }
    catch(err) {
        throw new NiceError(ErrorInfo.REGEXP_VALIDATION_FAILED, {
            name: ErrorType.REGEXP_VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}


// 定义 object 类型的 schema
class JObjectSchema extends JSchemaBase {
    properties?: { [key: string]: JSchemaBase | Array<JSchemaBase> } = {}
    values?: JType | Array<JType>
    additionalProperties?: boolean = true
    constructor(json: { [key: string]: any }, path?: string[]) {
        super({type:SchemaTypes.OBJECT}, path)
        // 字段校验
        let keys = Object.keys(this)
        keys.push('properties')
        keys.push('values')
        keys.push('additionalProperties')
        scanInputKeys(keys, json, path)
        Object.assign(this, json)
    }
}

// 检验对象
function validateObject(target: any, schema: { [key: string]: any }, refs: schemaRefType, path: string[]) : boolean {
    let chain = JSON.parse(JSON.stringify(path))
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        const realSchema = new JObjectSchema(schema, chain)
        // 类型正确
        if (Object.prototype.toString.call(target) === '[object Object]') {
            // 是否允许其它字段
            const allowOthers = realSchema.getValue('additionalProperties', SchemaTypes.BOOLEAN, refs, path)
            // 验证 values 规则
            if (realSchema.hasProp('values')) {
                // values 约定所有属性为某一个或多个类型
                if (realSchema.values instanceof Array) {
                    // 枚举检测对象的每一个属性
                    const keys = Object.keys(target)
                    for (let i=0; i<keys.length; i++) {
                        let value = target[keys[i]]
                        let yon = false
                        // 检查每个属性是否吻合允许类型列表中的一个
                        for (let j=0; j<realSchema.values.length; j++) {
                            // 这里的 try 是为了吞掉尝试检查时抛出的错误
                            try {
                                // 这里有可能出现错误，所以外面还有一个 try 进行捕捉
                                const propSchema = new JSchemaBase(realSchema.values[j], chain)
                                vjs(value,propSchema,refs,chain)
                                // 有一个类型吻合即可
                                yon = true
                                break
                            }
                            catch(ex) {
                                // 这里是为了尝试是否吻合指定类型的一个，因此捕捉到的错误不需要处理
                            }
                        }
                        // 没有找到任何吻合
                        if (yon === false) {
                            let valuesChain = JSON.parse(JSON.stringify(chain))
                            valuesChain.push(`values`)
                            throw new NiceError(ErrorInfo.VALUES_VALIDATION_FAILED, {
                                name: ErrorType.RESTRICTION_ERROR,
                                chain: valuesChain
                            })
                        }
                    }
                }
                // 单一类型元素
                else {
                    // 不知道类型，只要存在就可以尝试
                    // 下面的操作可能会出错，所以要用 try 包起来
                    try {
                        let propSchemaObj = realSchema.getValue('values',SchemaTypes.OBJECT,refs,chain)
                        const propSchema = new JSchemaBase(propSchemaObj,chain)
                        // 遍历每一个元素，检查是否指定类型
                        const keys = Object.keys(target)
                        for (let i=0; i<keys.length; i++) {
                            let prop = target[keys[i]]
                            vjs(prop, propSchema,refs,chain)
                        }
                    }
                    catch(err) {
                        let valuesChain = JSON.parse(JSON.stringify(chain))
                        valuesChain.push(`values`)
                        throw new NiceError(ErrorInfo.VALUES_VALIDATION_FAILED, {
                            name: ErrorType.RESTRICTION_ERROR,
                            chain: valuesChain
                        })
                    }
                }
            }
            // 验证 properties 规则
            if (realSchema.hasProp('properties')) {
                // properties 里将对每一个属性进行约定
                // 先获得 properties 的内容
                // 检查类型
                if (realSchema.properties && Object.prototype.toString.call(realSchema.properties) === '[object Object]') {
                    const propertySchemas = realSchema.properties
                    // 逐一验证
                    const targetKeys = Object.keys(target)
                    const propertyKeys = Object.keys(propertySchemas)
                    try {
                        // 校验 properties 里面定义的 schema 是否满足
                        for (let i=0; i<propertyKeys.length; i++) {
                            const key = propertyKeys[i]
                            // 检查 key 是否 oneOf 类型
                            if (key.indexOf('#oneOf')>0) {
                                const realKey = key.replace('#oneOf','')
                                // 检查 schem 值是否 array
                                const propSchemaItems = propertySchemas[key]
                                if (propSchemaItems instanceof Array) {
                                    // 验证是否符合其中之一
                                    let yon = false
                                    // 检查每个属性是否吻合允许类型列表中的一个
                                    for (let j=0; j<propSchemaItems.length; j++) {
                                        let propertiesChain = JSON.parse(JSON.stringify(chain))
                                        // 这里的 try 是为了吞掉尝试检查时抛出的错误
                                        try {
                                            // 这里有可能出现错误，所以外面还有一个 try 进行捕捉
                                            propertiesChain.push(`properties:${realKey}`)
                                            const propSchema = new JSchemaBase(propSchemaItems[j],propertiesChain)
                                            vjs(target[realKey],propSchema,refs,propertiesChain)
                                            // 有一个类型吻合即可
                                            yon = true
                                            break
                                        }
                                        catch(ex) {
                                            // 这里是为了尝试是否吻合指定类型的一个，因此捕捉到的错误不需要处理
                                            // 除非是输入内容的规则性错误
                                            if (ex instanceof NiceError) {
                                                if (ex.fullInfo().bomb === true) throw ex
                                            }
                                        }
                                    }
                                    // 没有找到任何吻合
                                    if (yon === false) {
                                        let propertiesChain = JSON.parse(JSON.stringify(chain))
                                        propertiesChain.push(`properties:${key}`)
                                        throw new NiceError(ErrorInfo.PROPERTIES_VALIDATION_FAILED, {
                                            name: ErrorType.RESTRICTION_ERROR,
                                            chain: propertiesChain
                                        })
                                    }
                                }
                                else {
                                    let propertiesChain = JSON.parse(JSON.stringify(chain))
                                    propertiesChain.push(`properties:${key}`)
                                    throw new NiceError(ErrorInfo.INVALID_SCHEMA_DEF + `, [${key}] Should Be An Array Of JSchema`, {
                                        name: ErrorType.SCHEMA_DEF_ERROR,
                                        chain: propertiesChain,
                                        info: {
                                            bomb: true
                                        }
                                    })
                                }
                            }
                            else {
                                let propertiesChain = JSON.parse(JSON.stringify(chain))
                                propertiesChain.push(`properties:${key}`)
                                vjs(target[key],propertySchemas[key],refs,propertiesChain)
                            }
                        }
                        // 校验用户给定的数据是否符合规则
                        for (let i=0; i<targetKeys.length; i++) {
                            let propertiesChain = JSON.parse(JSON.stringify(chain))
                            const key = targetKeys[i]
                            // 如果这个 key 没有包含在 properties 定义中，则检查 addtionalProperties 的值
                            if (propertyKeys.indexOf(key) < 0) {
                                if (allowOthers !== true) {
                                    propertiesChain.push(`properties:${key}`)
                                    throw new NiceError(ErrorInfo.PROPERTY_NOT_ALLOWED, {
                                        name: ErrorType.INVALID_PROPERTY_ERROR,
                                        chain: propertiesChain
                                    })
                                }
                            }
                        }
                    }
                    catch(err) {
                        let errPropertiesChain = JSON.parse(JSON.stringify(chain))
                        errPropertiesChain.push('properties')
                        throw new NiceError(ErrorInfo.PROPERTIES_RESTRICTION_NOT_SATISFIED, {
                            name: ErrorType.RESTRICTION_ERROR,
                            chain: errPropertiesChain,
                            cause: err
                        })
                    }
                }
                else {
                    let propertiesChain = JSON.parse(JSON.stringify(chain))
                    // properties 定义错误
                    propertiesChain.push('properties')
                    throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY, {
                        name: ErrorType.SCHEMA_DEF_ERROR,
                        chain: propertiesChain,
                        info: {
                            bomb: true
                        }
                    })
                }
            }
            return true
        }
        // 类型错误
        else {
            throw new NiceError(ErrorInfo.WRONG_TYPE, {
                name: ErrorType.TARGET_TYPE_ERROR,
                chain
            })
        }
    }
    catch(err) {
        throw new NiceError(ErrorInfo.OBJECT_VALIDATION_FAILED, {
            name: ErrorType.OBJECT_VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}

// 定义 array 类型的 schema
class JArraySchema extends JSchemaBase {
    items?: JType | Array<JType>
    itemsInOrder?: Array<JType>
    additionalItems?: boolean
    minItemsCount?: number
    maxItemsCount?: number
    constructor(json: { [key: string]: any }, path?: string[]) {
        super({type:SchemaTypes.ARRAY}, path)
        // 字段校验
        let keys = Object.keys(this)
        keys.push('items')
        keys.push('itemsInOrder')
        keys.push('additionalItems')
        keys.push('minItemsCount')
        keys.push('maxItemsCount')
        scanInputKeys(keys, json, path)
        Object.assign(this, json)
    }
}

// 检验数组
function validateArray(target: any, schema: { [key: string]: any }, refs: schemaRefType, path: string[]) : boolean {
    let chain = JSON.parse(JSON.stringify(path))
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        const realSchema = new JArraySchema(schema, chain)
        // 类型正确
        if (target instanceof Array) {
            // 是否满足元素数量的范围约束
            let tof = true
            if (realSchema.hasProp('minItemsCount') && realSchema.hasProp('maxItemsCount') && realSchema.getValue('minItemsCount',SchemaTypes.INTEGER,refs,path) > realSchema.getValue('maxItemsCount',SchemaTypes.INTEGER,refs,path)) {
                chain.push(`minItemsCount&maxItemsCount`)
                throw new NiceError(ErrorInfo.INVALID_SCHEMA_RULE, {
                    name: ErrorType.SCHEMA_DEF_ERROR,
                    chain,
                    info: {
                        bomb: true
                    }
                })
            }
            if (realSchema.hasProp('minItemsCount') && target.length < realSchema.getValue('minItemsCount',SchemaTypes.INTEGER,refs,path)) tof = false
            if (realSchema.hasProp('maxItemsCount') && target.length > realSchema.getValue('maxItemsCount',SchemaTypes.INTEGER,refs,path)) tof = false
            if (tof === false) {
                chain.push(`minItemsCount|maxItemsCount`)
                throw new NiceError(ErrorInfo.ITEMS_RESTRICTION_NOT_SATISFIED, {
                    name: ErrorType.RESTRICTION_ERROR,
                    chain
                })
            }
            // 两个制约条件不可以同时出现
            if (realSchema.hasProp('items') && realSchema.hasProp('itemsInOrder')) {
                chain.push(`items&itemsInOrder`)
                throw new NiceError(ErrorInfo.INVALID_SCHEMA_RULE + `, [items] and [itemsInOrder] can't be defined at the same time`, {
                    name: ErrorType.SCHEMA_DEF_ERROR,
                    chain,
                    info: {
                        bomb: true
                    }
                })
            }
            // 是否满足元素类型
            tof = true
            // 有 items 类型限定（此时不能出现 itemsInOrder 的限定）
            if (realSchema.hasProp('items') && realSchema.hasProp('itemsInOrder') === false) {
                // 多种类型元素
                if (realSchema.items instanceof Array) {
                    try {
                        // 枚举检测对象的每一个元素
                        for (let i=0; i<target.length; i++) {
                            let item = target[i]
                            let yon = false
                            // 检查每个元素是否吻合允许类型列表中的一个
                            for (let j=0; j<realSchema.items.length; j++) {
                                let itemsChain = JSON.parse(JSON.stringify(chain))
                                // 这里的 try 是为了吞掉尝试检查时抛出的错误
                                try {
                                    // 这里有可能出现错误，所以外面还有一个 try 进行捕捉
                                    itemsChain.push('items')
                                    const itemsSchema = new JSchemaBase(realSchema.items[j],itemsChain)
                                    vjs(item, itemsSchema,refs,itemsChain)
                                    // 有一个类型吻合即可
                                    yon = true
                                    break
                                }
                                catch(ex) {
                                    // 这里是为了尝试是否吻合指定类型的一个，因此捕捉到的错误不需要处理
                                    // 除非里面有输入规则性错误
                                    if (ex instanceof NiceError) {
                                        if (ex.fullInfo().bomb === true) throw ex
                                    }
                                }
                            }
                            // 没有找到任何吻合
                            if (yon === false) {
                                let itemsChain = JSON.parse(JSON.stringify(chain))
                                itemsChain.push(`items`)
                                throw new NiceError(ErrorInfo.ITEMS_VALIDATION_FAILED + ` - Zero Match`, {
                                    name: ErrorType.RESTRICTION_ERROR,
                                    chain: itemsChain
                                })
                            }
                        }
                    }
                    catch(err) {
                        let itemsErrChain = JSON.parse(JSON.stringify(chain))
                        itemsErrChain.push('items')
                        throw new NiceError(ErrorInfo.ITEMS_RESTRICTION_NOT_SATISFIED, {
                            name: ErrorType.RESTRICTION_ERROR,
                            chain: itemsErrChain,
                            cause: err
                        })
                    }
                }
                // 单一类型元素
                else {
                    chain.push('items')
                    // 不知道类型，只要存在就可以尝试
                    if (realSchema.items) {
                        // 下面的操作可能会出错，所以要用 try 包起来
                        try {
                            let itemSchemaObj = realSchema.getValue('items',SchemaTypes.OBJECT,refs,chain)
                            const itemSchema = new JSchemaBase(itemSchemaObj,chain)
                            // 遍历每一个元素，检查是否指定类型
                            for (let i=0; i<target.length; i++) {
                                let item = target[i]
                                vjs(item, itemSchema, refs, chain)
                            }
                        }
                        catch(err) {
                            // 这里的错误有两种可能：类型定义错误；校验元素类型失败
                            throw new NiceError(ErrorInfo.ITEMS_RESTRICTION_NOT_SATISFIED, {
                                name: ErrorType.RESTRICTION_ERROR,
                                chain,
                                cause: err
                            })
                        }
                    }
                    else {
                        throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY + ` - [items] must be a JSchema`, {
                            name: ErrorType.SCHEMA_DEF_ERROR,
                            chain,
                            info: {
                                bomb: true
                            }
                        })
                    }
                }
            }
            // 有 itemsInOrder 限定（此时不能出现 items 限定）
            if (realSchema.hasProp('itemsInOrder') && realSchema.hasProp('items') === false) {
                // 多个按指定顺序排列的元素类型
                if (realSchema.itemsInOrder instanceof Array) {
                    try {
                        // 元素个数少于 schema 限定的顺序类型个数
                        if (target.length < realSchema.itemsInOrder.length) {
                            let itemsChain = JSON.parse(JSON.stringify(chain))
                            itemsChain.push('itemsInOrder')
                            throw new NiceError(ErrorInfo.ITEMS_VALIDATION_FAILED, {
                                name: ErrorType.RESTRICTION_ERROR,
                                chain: itemsChain
                            })
                        }
                        // 元素个数与 schema 限定的顺序类型个数相等
                        else if (target.length === realSchema.itemsInOrder.length) {
                            let itemsChain = JSON.parse(JSON.stringify(chain))
                            itemsChain.push('itemsInOrder')
                            // 这里有可能出现错误，所以外面有一个 try 进行捕捉
                            try {
                                for (let j=0; j<realSchema.itemsInOrder.length; j++) {
                                    const itemsSchema = new JSchemaBase(realSchema.itemsInOrder[j],itemsChain)
                                    // validate 一旦不通过会直接抛出错误
                                    vjs(target[j], itemsSchema,refs,itemsChain)
                                }
                            }
                            catch(err) {
                                // 这里的错误有两种可能：类型定义错误；校验元素类型失败
                                throw new NiceError(ErrorInfo.ITEMS_VALIDATION_FAILED, {
                                    name: ErrorType.RESTRICTION_ERROR,
                                    chain: itemsChain,
                                    cause: err
                                })
                            }
                        }
                        // 元素个数多于 schema 限定的顺序类型个数
                        else {
                            // 检查 additionalItems 是否允许
                            if (realSchema.hasProp('additionalItems')) {
                                // 如果是数组，意味着可以接受更多元素，但是必须限于数组指定的类型
                                let itemsChain = JSON.parse(JSON.stringify(chain))
                                itemsChain.push('additionalItems')
                                if (typeof realSchema.additionalItems === 'boolean') {
                                    // 当 additionalItems 为 false 时不允许多出来的元素
                                    if (realSchema.additionalItems === false) {
                                        throw new NiceError(ErrorInfo.ADDITIONAL_ITEMS_NOT_ALLOWED, {
                                            name: ErrorType.RESTRICTION_ERROR,
                                            chain: itemsChain
                                        })
                                    }
                                }
                                // 其余情况为错误配置
                                else {
                                    throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY + ` - [additionalItems] must be a Boolean`, {
                                        name: ErrorType.SCHEMA_DEF_ERROR,
                                        chain: itemsChain,
                                        info: {
                                            bomb: true
                                        }
                                    })
                                }
                            }
                        }
                    }
                    catch(err) {
                        let itemsErrChain = JSON.parse(JSON.stringify(chain))
                        itemsErrChain.push('itemsInOrder')
                        throw new NiceError(ErrorInfo.ITEMS_RESTRICTION_NOT_SATISFIED, {
                            name: ErrorType.RESTRICTION_ERROR,
                            chain: itemsErrChain,
                            cause: err
                        })
                    }
                }
                else {
                    let itemsInOrderChain = JSON.parse(JSON.stringify(chain))
                    throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY + ` - [itemsInOrder] must be an Array`, {
                        name: ErrorType.SCHEMA_DEF_ERROR,
                        chain: itemsInOrderChain,
                        info: {
                            bomb: true
                        }
                    })
                }
            }
            return true
        }
        // 类型错误
        else {
            throw new NiceError(ErrorInfo.WRONG_TYPE, {
                name: ErrorType.TARGET_TYPE_ERROR,
                chain
            })
        }
    }
    catch(err) {
        throw new NiceError(ErrorInfo.ARRAY_VALIDATION_FAILED, {
            name: ErrorType.ARRAY_VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}

// 定义 quotable 类型的 schema
class JQuotableSchema extends JSchemaBase {
    schema: string = ''
    constructor(json: { [key: string]: any }, path?: string[]) {
        super({type:SchemaTypes.QUOTABLE}, path)
        // 字段校验
        let keys = Object.keys(this)
        scanInputKeys(keys, json, path)
        Object.assign(this, json)
    }
}

// 检验 Quotable 类型
function validateQuotable(target: any, schema: { [key: string]: any }, refs: schemaRefType, path: string[]) : boolean {
    let chain = JSON.parse(JSON.stringify(path))
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        let keys = Object.keys(refs)
        const realSchema = new JQuotableSchema(schema,chain)
        if (typeof realSchema.schema === 'string' && realSchema.schema[0] === '$' && realSchema.schema[1] !== '$') {
            let key = realSchema.schema.replace('$','')
            if (keys.indexOf(key) >= 0) {
                // 找到 ref
                vjs(target, refs[key], refs, chain)
            }
            else {
                chain.push(`schema`)
                chain.push(key)
                throw new NiceError(ErrorInfo.INVALID_QUOTABLE_SCHEMA_KEY + ` - quotable schema key [${key}] not found in refs`, {
                    name: ErrorType.SCHEMA_DEF_ERROR,
                    chain,
                    info: {
                        bomb: true
                    }
                })
            }
        }
        else {
            chain.push(`schema`)
            throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY + ` - [schema] must be a string starts with '$'`, {
                name: ErrorType.SCHEMA_DEF_ERROR,
                chain,
                info: {
                    bomb: true
                }
            })
        }
        return true
    }
    catch(err) {
        throw new NiceError(ErrorInfo.QUOTABLE_VALIDATION_FAILED, {
            name: ErrorType.QUOTABLE_VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}

// 定义 multiple 类型的 schema
class JMultipleSchema extends JSchemaBase {
    oneOf: Array<JSchemaBase> = []
    constructor(json: { [key: string]: any }, path?: string[]) {
        super({type:SchemaTypes.MULTIPLE}, path)
        // 字段校验
        let keys = Object.keys(this)
        scanInputKeys(keys, json, path)
        Object.assign(this, json)
    }
}

// 检验 Multiple 类型
function validateMultiple(target: any, schema: { [key: string]: any }, refs: schemaRefType, path: string[]) : boolean {
    let chain = JSON.parse(JSON.stringify(path))
    // 创建一个副本用于 catch，因为 chain 是引用类型，可能会在 try 里被修改
    let errChain = JSON.parse(JSON.stringify(chain))
    try {
        const realSchema = new JMultipleSchema(schema,chain)
        // 检查 oneOf 属性是否合规
        try {
            let checkChain = JSON.parse(JSON.stringify(path))
            checkChain.push(`oneOf`)
            vjs(realSchema.oneOf,{
                type: SchemaTypes.ARRAY,
                required: true,
                items: [
                    { type: SchemaTypes.OBJECT }
                ]
            },refs||{},checkChain)
        }
        catch(error) {
            let innerErrChain = JSON.parse(JSON.stringify(chain))
            innerErrChain.push('oneOf')
            throw new NiceError(ErrorInfo.INVALID_SCHEMA_KEY + ` - [oneOf] must be an Array of JSchema`, {
                name: ErrorType.SCHEMA_DEF_ERROR,
                chain,
                cause: error,
                info: {
                    bomb: true
                }
            })
        }
        // 逐个检验是否吻合，有一个吻合即可
        let yon = false
        for (let i=0; i<realSchema.oneOf.length; i++) {
            let oneOfChain = JSON.parse(JSON.stringify(chain))
            try {
                let oneOfSchema = realSchema.oneOf[i]
                oneOfChain.push('oneOf')
                oneOfChain.push(`${i}:${oneOfSchema.type}`)
                vjs(target,oneOfSchema,refs||{},oneOfChain)
                yon = true
                return true
            }
            catch(ex) {
                // 这里的错误吞掉即可
                // 除非里面有输入规则性错误
                if (ex instanceof NiceError) {
                    if (ex.fullInfo().bomb === true) throw ex
                }
            }
        }
        if (yon === false) {
            let oneOfChain = JSON.parse(JSON.stringify(chain))
            oneOfChain.push(`oneOf`)
            throw new NiceError(ErrorInfo.NO_ONE_MATCHES, {
                name: ErrorType.RESTRICTION_ERROR,
                chain: oneOfChain
            })
        }
        return true
    }
    catch(err) {
        throw new NiceError(ErrorInfo.MULTIPLE_VALIDATION_FAILED, {
            name: ErrorType.MULTIPLE_VALIDATION_ERROR,
            chain: errChain,
            cause: err
        })
    }
}
