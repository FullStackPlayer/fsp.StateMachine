/**
 * 这里将用状态机模拟一个审批流程的处理
 */

import NiceError from '../src/NiceError.ts'
import { StateMachine } from '../src/StateMachine.ts'

// 流转状态
const FlowStatus = {
    CREATED: 'created',
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    IN_PROGRESS: 'in_progress',
    REJECTED: 'rejected',
    APPROVED: 'approved',
    CANCELLED: 'cancelled',
    DELETED: 'deleted'
}

// 节点审批结果
const NodeApprovalResult = {
    UNSET: 'unset',
    APPROVED: 'approved',
    REJECTED: 'rejected'
}

// 节点审批模式
const NodeApprovalMode = {
    SINGLE: 'single',
    SEQUENTIAL: 'sequential',
    ANY: 'any',
    ALL: 'all'
}

// 生成状态机数据载荷
const getPayload = () => {
    return {
        id: '',
        status: FlowStatus.CREATED,
        createdBy: '张三',
        createdAt: new Date(),
        submittedAt: null,
        updatedAt: null,
        passedAt: null,
        cancelledAt: null,
        deletedAt: null,
        type: '审批',
        title: '关于4月份不良品处理的审批',
        content: '',
        attachments: [],
        flowId: 'FL' + Math.random().toString().split('.')[1],
        flowPath: [
            {
                name: '提交',
                mode: NodeApprovalMode.SINGLE,
                nodes: [
                    {
                        department: '压缩机车间',
                        account: 'zhangsan',
                        result: NodeApprovalResult.UNSET
                    }
                ]
            },
            {
                name: '条线内部审批',
                mode: NodeApprovalMode.SEQUENTIAL,
                nodes: [
                    {
                        department: '压缩机车间',
                        account: 'lisi',
                        result: NodeApprovalResult.UNSET
                    },
                    {
                        department: '生产管理部',
                        account: 'wangwu',
                        result: NodeApprovalResult.UNSET
                    }
                ]
            },
            {
                name: '关联条线联审',
                mode: NodeApprovalMode.ALL,
                nodes: [
                    {
                        department: '质量管理部',
                        account: 'zhaoliu',
                        result: NodeApprovalResult.UNSET
                    },
                    {
                        department: '仓储管理部',
                        account: 'qianqi',
                        result: NodeApprovalResult.UNSET
                    }
                ]
            },
            {
                name: '财务部门审批',
                mode: NodeApprovalMode.SINGLE,
                nodes: [
                    {
                        department: '财务部',
                        account: 'jinba',
                        result: NodeApprovalResult.UNSET
                    }
                ]
            },
            {
                name: '公司领导审批',
                mode: NodeApprovalMode.SINGLE,
                nodes: [
                    {
                        department: '公司领导',
                        account: 'wangjiu',
                        result: NodeApprovalResult.UNSET
                    }
                ]
            }
        ],
        history: [
            {
                timestamp: new Date(),
                account: 'zhangsan',
                description: '[zhangsan]创建了审批内容'
            }
        ]
    }
}

const transitions = [
    // 保存为草稿
    {
        name: 'draft',
        from: FlowStatus.CREATED,
        to: FlowStatus.DRAFT,
        before: async (sm: StateMachine, name: string, from: string | string[], to: string, env?: { [key: string]: any }) => {
            // 生成id
            let data = sm.payload
            data.id = 'AP' + Math.random().toString().split('.')[1]
            return true
        },
        transform: async (sm: StateMachine, name: string, from: string | string[], to: string, env?: { [key: string]: any }) => {
            let data = sm.payload
            data.status = FlowStatus.DRAFT
            data.updatedAt = new Date()
            // 更新流程记录
            data.history.push({
                timestamp: new Date(),
                account: env?.currentAccount,
                description: `[${env?.currentAccount}]将审批内容保存为草稿`
            })
            return true
        }
    },
    // 提交审批
    {
        name: 'submit',
        from: [
            FlowStatus.CREATED,
            FlowStatus.DRAFT
        ],
        to: FlowStatus.SUBMITTED,
        before: async (sm: StateMachine, name: string, from: string | string[], to: string, env?: { [key: string]: any }) => {
            // 生成id
            let data = sm.payload
            if (data.id !== '') data.id = 'AP' + Math.random().toString().split('.')[1]
            return true
        },
        transform: async (sm: StateMachine, name: string, from: string | string[], to: string, env?: { [key: string]: any }) => {
            let data = sm.payload
            data.status = FlowStatus.SUBMITTED
            data.submittedAt = new Date()
            data.updatedAt = new Date()
            // 更新 flowPath，找到当前账号对应的节点
            flow: for (let i = 0; i < data.flowPath.length; i++) {
                const segment = data.flowPath[i]
                node: for (let j = 0; j < segment.nodes.length; j++) {
                    const node = segment.nodes[j]
                    if (node.account === env?.currentAccount) {
                        node.result = NodeApprovalResult.APPROVED
                        break node
                    }
                }
                break flow
            }
            // 更新流程记录
            data.history.push({
                timestamp: new Date(),
                account: env?.currentAccount,
                description: `[${env?.currentAccount}]将草稿提交审批`
            })
            return true
        }
    },
    // 节点审批通过
    {
        name: 'step',
        from: [
            FlowStatus.SUBMITTED,
            FlowStatus.IN_PROGRESS
        ],
        to: FlowStatus.IN_PROGRESS,
        transform: async (sm: StateMachine, name: string, from: string | string[], to: string, env?: { [key: string]: any }) => {
            let data = sm.payload
            data.status = FlowStatus.IN_PROGRESS
            data.updatedAt = new Date()
            // 更新 flowPath，找到当前账号对应的节点
            // 严谨起见，还应该检查之前的节点是否都审批通过，这里先略过
            flow: for (let i = 0; i < data.flowPath.length; i++) {
                const segment = data.flowPath[i]
                node: for (let j = 0; j < segment.nodes.length; j++) {
                    const node = segment.nodes[j]
                    if (node.account === env?.currentAccount) {
                        node.result = NodeApprovalResult.APPROVED
                        break node
                        break flow
                    }
                }
            }
            // 更新流程记录
            data.history.push({
                timestamp: new Date(),
                account: env?.currentAccount,
                description: `[${env?.currentAccount}]审批通过`
            })
            return true
        },
        after: async (sm: StateMachine, name: string, from: string | string[], to: string, env?: { [key: string]: any }) => {
            // 根据审批人判断是否完结审批
            if (env?.currentAccount === 'wangjiu') await sm.do('pass')
            return true
        }
    },
    // 驳回
    {
        name: 'reject',
        from: [
            FlowStatus.SUBMITTED,
            FlowStatus.IN_PROGRESS
        ],
        to: FlowStatus.REJECTED,
        transform: async (sm: StateMachine, name: string, from: string | string[], to: string, env?: { [key: string]: any }) => {
            let data = sm.payload
            data.status = FlowStatus.REJECTED
            data.updatedAt = new Date()
            // 更新 flowPath，找到当前账号对应的节点
            flow: for (let i = 0; i < data.flowPath.length; i++) {
                const segment = data.flowPath[i]
                node: for (let j = 0; j < segment.nodes.length; j++) {
                    const node = segment.nodes[j]
                    if (node.account === env?.currentAccount) {
                        node.result = NodeApprovalResult.REJECTED
                        break node
                        break flow
                    }
                }
            }
            // 更新流程记录
            data.history.push({
                timestamp: new Date(),
                account: env?.currentAccount,
                description: `[${env?.currentAccount}]驳回了审批`
            })
            return true
        }
    },
    // 审批完成
    {
        name: 'pass',
        from: [
            FlowStatus.IN_PROGRESS
        ],
        to: FlowStatus.APPROVED,
        transform: async (sm: StateMachine, name: string, from: string | string[], to: string, env?: { [key: string]: any }) => {
            let data = sm.payload
            data.status = FlowStatus.APPROVED
            data.updatedAt = new Date()
            data.passedAt = new Date()
            // 更新流程记录
            data.history.push({
                timestamp: new Date(),
                account: `system`,
                description: `[system]完成了审批`
            })
            return true
        }
    },
    // 取消
    {
        name: 'cancel',
        from: [
            FlowStatus.DRAFT,
            FlowStatus.SUBMITTED,
            FlowStatus.IN_PROGRESS
        ],
        to: FlowStatus.CANCELLED,
        transform: async (sm: StateMachine, name: string, from: string | string[], to: string, env?: { [key: string]: any }) => {
            let data = sm.payload
            data.status = FlowStatus.CANCELLED
            data.updatedAt = new Date()
            data.cancelledAt = new Date()
            // 更新流程记录
            data.history.push({
                timestamp: new Date(),
                account: env?.currentAccount,
                description: `[${env?.currentAccount}]取消了审批`
            })
            return true
        }
    },
    // 删除
    {
        name: 'delete',
        from: [
            FlowStatus.CANCELLED
        ],
        to: FlowStatus.DELETED,
        transform: async (sm: StateMachine, name: string, from: string | string[], to: string, env?: { [key: string]: any }) => {
            let data = sm.payload
            data.status = FlowStatus.DELETED
            data.updatedAt = new Date()
            data.deletedAt = new Date()
            // 更新流程记录
            data.history.push({
                timestamp: new Date(),
                account: env?.currentAccount,
                description: `[${env?.currentAccount}]删除了审批`
            })
            return true
        }
    }
]

const onBeforeTransform = async (sm: StateMachine, action: string, env?: { [key: string]: any }) => {
    console.log(`从 [${sm.state}] 状态开始执行 [${action}]`)
    return true
}

const onAfterTransform = async (sm: StateMachine, action: string, env?: { [key: string]: any }) => {
    console.log(`当前状态 [${sm.state}]`)
    return true
}

async function doIt() {
    try {
        let fsm = new StateMachine({
            init: FlowStatus.CREATED,
            payload: getPayload(),
            transitions,
            onBeforeTransform,
            onAfterTransform
        })
        console.log('当前状态',fsm.state)
        console.log('所有状态',fsm.allStates())
        console.log('所有操作',fsm.allTransitions())
        console.log('当前可用操作',fsm.validTransitions())
        // 模拟正常审批流
        console.log('正常审批演示------------------')
        await fsm.do('draft', { currentAccount: 'zhangsan' })
        await fsm.do('submit', { currentAccount: 'zhangsan' })
        await fsm.do('step', { currentAccount: 'lisi' })
        await fsm.do('step', { currentAccount: 'wangwu' })
        await fsm.do('step', { currentAccount: 'zhaoliu' })
        await fsm.do('step', { currentAccount: 'qianqi' })
        await fsm.do('step', { currentAccount: 'jinba' })
        await fsm.do('step', { currentAccount: 'wangjiu' })
        console.log('最终状态',fsm.state)
        console.log(JSON.stringify(fsm.payload,null,4))
        // 模拟审批被驳回
        console.log('审批驳回演示------------------')
        fsm = new StateMachine({
            init: FlowStatus.CREATED,
            payload: getPayload(),
            transitions,
            onBeforeTransform,
            onAfterTransform
        })
        await fsm.do('submit', { currentAccount: 'zhangsan' })
        await fsm.do('step', { currentAccount: 'lisi' })
        await fsm.do('step', { currentAccount: 'wangwu' })
        await fsm.do('step', { currentAccount: 'zhaoliu' })
        await fsm.do('reject', { currentAccount: 'qianqi' })
        console.log('最终状态',fsm.state)
        console.log(JSON.stringify(fsm.payload,null,4))
        // 模拟审批被撤销并删除
        console.log('审批撤销演示------------------')
        fsm = new StateMachine({
            init: FlowStatus.CREATED,
            payload: getPayload(),
            transitions,
            onBeforeTransform,
            onAfterTransform
        })
        await fsm.do('submit', { currentAccount: 'zhangsan' })
        await fsm.do('step', { currentAccount: 'lisi' })
        await fsm.do('step', { currentAccount: 'wangwu' })
        await fsm.do('step', { currentAccount: 'zhaoliu' })
        await fsm.do('cancel', { currentAccount: 'zhaoliu' })
        await fsm.do('delete', { currentAccount: 'admin' })
        console.log('最终状态',fsm.state)
        console.log(JSON.stringify(fsm.payload,null,4))
    }
    catch(err) {
        if (err instanceof NiceError) console.log(err.fullMessage())
        else console.log(err)
    }
}
 
await doIt()
 