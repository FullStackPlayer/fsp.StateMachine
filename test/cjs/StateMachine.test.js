const { StateMachine } = require('../../dist/cjs/StateMachine')
const {assertError, assertEquals, tryCatch} = require("./Tools.js")

// 测试 StateMachine 对象的封装
test('StateMachine Constructor', async () => {
        // 未指定类型
        assertError(()=>{
            new StateMachine({})
        },
        `[InitError]: State Machine Initialization Failed <= [JsonCheckError]: Not Valid State Machine Json Object <= [ValidationError@vjs:root/validate:object]: Validation Failed <= [ObjectValidationError@vjs:root/validate:object]: Object Validation Failed <= [RestrictionError@vjs:root/validate:object/properties]: Properties Restriction Not Satisfied <= [ValidationError@vjs:root/validate:object/properties:init/validate:string]: Validation Failed <= [TargetMissingError@vjs:root/validate:object/properties:init/validate:string/required]: Target Required, but we got 'undefined'`)
        // transitions 不正确
        assertError(()=>{
            new StateMachine({
                init: 'default',
                transitions: [
                    {
                        name: '',
                        from: 123,
                        to: 456
                    }
                ]
            })
        },
        `[InitError]: State Machine Initialization Failed <= [JsonCheckError]: Not Valid State Machine Json Object <= [ValidationError@vjs:root/validate:object]: Validation Failed <= [ObjectValidationError@vjs:root/validate:object]: Object Validation Failed <= [RestrictionError@vjs:root/validate:object/properties]: Properties Restriction Not Satisfied <= [ValidationError@vjs:root/validate:object/properties:transitions/validate:array]: Validation Failed <= [ArrayValidationError@vjs:root/validate:object/properties:transitions/validate:array]: Array Validation Failed <= [RestrictionError@vjs:root/validate:object/properties:transitions/validate:array/items]: Items Restriction Not Satisfied <= [ValidationError@vjs:root/validate:object/properties:transitions/validate:array/items/validate:object]: Validation Failed <= [ObjectValidationError@vjs:root/validate:object/properties:transitions/validate:array/items/validate:object]: Object Validation Failed <= [RestrictionError@vjs:root/validate:object/properties:transitions/validate:array/items/validate:object/properties]: Properties Restriction Not Satisfied <= [ValidationError@vjs:root/validate:object/properties:transitions/validate:array/items/validate:object/properties:from/validate:multiple]: Validation Failed <= [MultipleValidationError@vjs:root/validate:object/properties:transitions/validate:array/items/validate:object/properties:from/validate:multiple]: Multiple Validation Failed <= [RestrictionError@vjs:root/validate:object/properties:transitions/validate:array/items/validate:object/properties:from/validate:multiple/oneOf]: No One Matches`)
        // 合法的定义
        let sm = new StateMachine({
            init: 'default',
            transitions: [
                {
                    name: 'melt',
                    from: 'solid',
                    to: 'liquid'
                },
                {
                    name: 'freeze',
                    from: 'liquid',
                    to: 'freeze'
                }
            ],
        })
        assertEquals(sm.state, 'default')
    }
)

// 测试 StateMachine 的方法
test('StateMachine methods',async () => {
        // 指定了不合规的类型
        let sm = new StateMachine({
            init: 'off',
            payload: {
                id: 1,
                status: 'off',
                totalAmount: 100,
                openAmount: 0,
                closedAmount: 100
            },
            transitions: [
                {
                    name: 'warn',
                    from: 'red',
                    to: 'yellow'
                },
                {
                    name: 'walk',
                    from: 'yellow',
                    to: 'green'
                },
                {
                    name: 'warn',
                    from: 'green',
                    to: 'yellow'
                },
                {
                    name: 'stop',
                    from: 'yellow',
                    to: 'red'
                },
                {
                    name: 'turnon',
                    from: 'off',
                    to: 'red',
                    transform: async (sm, name, from, to, env) => {
                        sm.payload.openAmount = 100
                        sm.payload.closedAmount = 0
                        sm.payload.status = 'red'
                        return true
                    }
                },
                {
                    name: 'turnoff',
                    from: [
                        'red',
                        'yellow',
                        'green'
                    ],
                    to: 'off',
                    before: async (sm, name, from, to, env) => {
                        // console.log(`my state is ${sm.state}`)
                    },
                    transform: async (sm, name, from, to, env) => {
                        // console.log(`i am ${name}ing now`)
                    },
                    after: async (sm, name, from, to, env) => {
                        // console.log(`my new state is ${sm.state}`)
                    },
                },
            ]
        })
        assertEquals(sm.payload.openAmount,0)
        assertEquals(sm.state, 'off')
        assertEquals(sm.is('off'),true)
        assertEquals(sm.validTransitions(),[ "turnon" ])
        assertEquals(sm.allTransitions(),[ "warn", "walk", "stop", "turnon", "turnoff" ])
        assertEquals(sm.allStates(),[ "red", "yellow", "green", "off" ])
        assertEquals(sm.canDo('turnon'),true)
        assertEquals(await sm.do('turnon'),true)
        assertEquals(sm.payload.openAmount,100)
        assertEquals(sm.is('red'),true)
        assertEquals(sm.validTransitions(),["warn","turnoff"])
        assertEquals(await sm.do('warn'),true)
        assertEquals(sm.is('yellow'),true)
        assertEquals(await sm.do('turnoff'),true)
        try {
            await sm.do('warn')
        }
        catch(err) {
            assertEquals(err.fullMessage(),`[TransitionError]: Transition Failed <= [LogicError]: Transition Not Allowed - [warn]`)
        }
    }
)
