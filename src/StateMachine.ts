/**
 * 状态机
 */

import NiceError from "./NiceError.ts";
import { vjs, SchemaTypes, JSchemaBase } from "./JSchema.ts";

// 错误类型
export enum ErrorType {
    INIT_ERROR = 'InitError',
    JSON_CHECK_ERROR = 'JsonCheckError',
    LOGIC_ERROR = 'LogicError',
    TRANSITION_ERROR = 'TransitionError'
}

// 错误描述
export enum ErrorInfo {
    STATE_MACHINE_INITIALIZATION_FAILED = 'State Machine Initialization Failed',
    NOT_VALID_STATE_MACHINE_JSON_OBJECT = 'Not Valid State Machine Json Object',
    TRANSITION_NOT_ALLOWED = 'Transition Not Allowed',
    TRANSITION_FAILED = 'Transition Failed'
}

// 参数校验 schema
const configSchema = {
    type: SchemaTypes.OBJECT,
    properties: {
        init: { type: SchemaTypes.STRING, required: true },
        payload: { type: SchemaTypes.OBJECT, additionalProperties: true },
        transitions: {
            type: SchemaTypes.ARRAY,
            required: true,
            items: {
                type: SchemaTypes.OBJECT,
                properties: {
                    name: { type: SchemaTypes.STRING, required: true },
                    from: {
                        type: SchemaTypes.MULTIPLE,
                        required: true,
                        oneOf: [
                            {
                                type: SchemaTypes.STRING
                            },
                            {
                                type: SchemaTypes.ARRAY,
                                items: { type: SchemaTypes.STRING }
                            }
                        ]
                    },
                    to: { type: SchemaTypes.STRING, required: true },
                    transform: { type: SchemaTypes.FUNCTION },
                    before: { type: SchemaTypes.FUNCTION },
                    after: { type: SchemaTypes.FUNCTION },
                },
                additionalProperties: false
            },
            additionalItems: false
        },
        onTransform: { type: SchemaTypes.FUNCTION },
        onBeforeTransform: { type: SchemaTypes.FUNCTION },
        onAfterTransform: { type: SchemaTypes.FUNCTION },
    },
    additionalProperties: false
}

// Transition 类
export class Transition {
    name: string = ''
    from: string | string[] = ''
    to: string = ''
    stateMachine: null | StateMachine = null
    onTransform: Function = async () : Promise<boolean> => true
    onBefore: Function = async () : Promise<boolean> => true
    onAfter: Function = async () : Promise<boolean> => true
    // 构造函数
    constructor(json: { [key: string]: any }, sm: StateMachine) {
        // 拷贝属性
        this.name = json.name
        this.from = json.from
        this.to = json.to
        this.stateMachine = sm
        // 内置方法
        if (typeof json.transform === 'function') {
            this.onTransform = async (env?: { [key: string]: any }) : Promise<boolean> => {
                return await json.transform(this.stateMachine,this.name,this.from,this.to,env)
            }
        }
        if (typeof json.before === 'function') {
            this.onBefore = async (env?: { [key: string]: any }) : Promise<boolean> => {
                return await json.before(this.stateMachine,this.name,this.from,this.to,env)
            }
        }
        if (typeof json.after === 'function') {
            this.onAfter = async (env?: { [key: string]: any }) : Promise<boolean> => {
                return await json.after(this.stateMachine,this.name,this.from,this.to,env)
            }
        }
    }
}

// 状态机类
export class StateMachine {
    // 属性
    state: string = ''
    payload: { [key: string]: any } = {}
    private originalTransitions: Array<{ [key: string]: any }> = []
    transitions: Array<Transition> = []
    onTransform: Function = async () : Promise<boolean> => true
    onBeforeTransform: Function = async () : Promise<boolean> => true
    onAfterTransform: Function = async () : Promise<boolean> => true
    // 构造函数
    constructor(json: { [key: string]: any }) {
        if (json !== undefined) {
            try {
                // 输入的 json 格式校验
                vjs(json,configSchema,{})
                // 初始值设定
                if (json.init && json.init !== '') this.state = json.init
                if (json.payload) this.payload = JSON.parse(JSON.stringify(json.payload))
                if (json.onTransform) this.onTransform = async (action: string, env?: { [key: string]: any }) : Promise<boolean> => {
                    return await json.onTransform(this, action, env)
                }
                if (json.onBeforeTransform) this.onBeforeTransform = async (action: string, env?: { [key: string]: any }) : Promise<boolean> => {
                    return await json.onBeforeTransform(this, action, env)
                }
                if (json.onAfterTransform) this.onAfterTransform = async (action: string, env?: { [key: string]: any }) : Promise<boolean> => {
                    return await json.onAfterTransform(this, action, env)
                }
                this.originalTransitions = json.transitions
                // 实例化 Commands
                for (let i=0; i<this.originalTransitions.length; i++) {
                    let originalTransition = this.originalTransitions[i]
                    this.transitions.push(new Transition(originalTransition,this))
                }
            }
            catch (err) {
                throw new NiceError(ErrorInfo.STATE_MACHINE_INITIALIZATION_FAILED , {
                    name: ErrorType.INIT_ERROR,
                    cause: new NiceError(ErrorInfo.NOT_VALID_STATE_MACHINE_JSON_OBJECT , {
                        name: ErrorType.JSON_CHECK_ERROR,
                        cause: err
                    })
                })
            }
        }
    }
    // 判断是否某个状态
    public is(state:string) : boolean {
        return this.state === state
    }
    // 判断是否可以执行某个操作
    public canDo(action:string) : boolean {
        // 找到当前状态对应的 transitions
        for (let i = 0; i < this.transitions.length; i++) {
            const transition = this.transitions[i]
            if (typeof transition.from === 'string') {
                if (transition.from === this.state) {
                    if (transition.name === action) return true
                }
            }
            else {
                if (transition.from.indexOf(this.state) >= 0) {
                    if (transition.name === action) return true
                }
            }
        }
        return false
    }
    // 执行某个动作
    public async do(action: string, env?: { [key: string]: any }) : Promise<boolean> {
        try {
            await this.onBeforeTransform(action,env)
            // 找到当前状态对应的 transition
            for (let i = 0; i < this.transitions.length; i++) {
                const transition = this.transitions[i]
                let yon = false
                if (typeof transition.from === 'string') {
                    if (transition.from === this.state) {
                        if (transition.name === action) yon = true
                    }
                }
                else {
                    if (transition.from.indexOf(this.state) >= 0) {
                        if (transition.name === action) yon = true
                    }
                }
                if (yon) {
                    await transition.onBefore(env)
                    await transition.onTransform(env)
                    await this.onTransform(action,env)
                    this.state = transition.to
                    await transition.onAfter(env)
                    await this.onAfterTransform(action,env)
                    return true
                }
            }
            // 如果前面没有返回 true 则意味着是不被许可的操作
            throw new NiceError(ErrorInfo.TRANSITION_NOT_ALLOWED + ` - [${action}]` , {
                name: ErrorType.LOGIC_ERROR,
            })
        }
        catch (err) {
            throw new NiceError(ErrorInfo.TRANSITION_FAILED , {
                name: ErrorType.TRANSITION_ERROR,
                cause: err
            })
        }
    }
    // 获取所有可能的 transitions
    public validTransitions() : string[] {
        let result : string[] = []
        // 找到当前状态对应的 transitions
        for (let i = 0; i < this.transitions.length; i++) {
            const transition = this.transitions[i]
            if (typeof transition.from === 'string') {
                if (transition.from === this.state) {
                    if (result.indexOf(transition.name) < 0) result.push(transition.name)
                }
            }
            else {
                if (transition.from.indexOf(this.state) >= 0) {
                    if (result.indexOf(transition.name) < 0) result.push(transition.name)
                }
            }
        }
        return result
    }
    // 获取所有 transitions
    public allTransitions() : string[] {
        let result : string[] = []
        // 找到当前状态对应的 transitions
        for (let i = 0; i < this.transitions.length; i++) {
            const transition = this.transitions[i]
            if (result.indexOf(transition.name) < 0) result.push(transition.name)
        }
        return result
    }
    // 获取所有 states
    public allStates() : string[] {
        let result : string[] = []
        for (let i = 0; i < this.transitions.length; i++) {
            const transition = this.transitions[i]
            if (typeof transition.from === 'string') {
                if (result.indexOf(transition.from) < 0) result.push(transition.from)
                if (result.indexOf(transition.to) < 0) result.push(transition.to)
            }
            else {
                for (let j = 0; j < transition.from.length; j++) {
                    const state = transition.from[j]
                    if (result.indexOf(state) < 0) result.push(state)
                }
                if (result.indexOf(transition.to) < 0) result.push(transition.to)
            }
        }
        return result
    }
}