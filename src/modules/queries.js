import {query} from  "./postgres"
import {CHAIN_STATUS_PENDING, CHAIN_STATUS_CANONICAL, CHAIN_STATUS_ORPHANED, CHAIN_STATUS_ALL} from "./consts"
import {TextDecoder} from 'util'
import {decode} from "@faustbrian/node-base58"

export const qDisputeBlocks = async () => {
    const sql = `
        select distinct * 
        from v_blocks b 
        where b.chain_status = '${CHAIN_STATUS_PENDING}' 
        and height > (
            select max(height) 
            from v_blocks 
            where chain_status = '${CHAIN_STATUS_CANONICAL}' 
        )`

    return (await query(sql)).rows
}

export const qBlocks = async ({
    type = CHAIN_STATUS_CANONICAL,
    limit = 50,
    offset = 0
} = {}) => {
    const sql = `
        select * 
        from v_blocks b 
        where chain_status = ANY($1::chain_status_type[])
        limit $2 offset $3        
    `

    return (await query(sql, [Array.isArray(type) ? type : [type], limit, offset])).rows
}

export const qAddressBlocks = async (pk, {
    type = CHAIN_STATUS_ALL,
    limit = 50,
    offset = 0,
} = {}) => {
    if (!pk) {
        throw new Error('You must specified address for this query [qAddressBlocks]')
    }

    const sql = `
        select * 
        from v_blocks b
        where b.creator_key = $1
        and chain_status = ANY($2::chain_status_type[])
        limit $3 offset $4
    `

    return (await query(sql, [pk, Array.isArray(type) ? type : [type], limit, offset])).rows
}

export const qAddressTransactions = async (pk, {
    limit = 50,
    offset = 0,
} = {}) => {
    if (!pk) {
        throw new Error('You must specified address for this query [qAddressBlocks]')
    }

    const sql = `
        select * from v_trans 
        where chain_status = 'canonical'
        and (trans_owner = $1 or trans_receiver = $1)
        order by timestamp desc, nonce desc
        limit $2 offset $3
    `

    const result = (await query(sql, [pk, limit, offset])).rows

    result.map((r) => {
        r.memo = (new TextDecoder().decode(decode(r.memo).slice(3, -4)))
    })

    return result
}

export const qTotalBlocks = async () => {
    const sql = `
        select max(height) as height
        from blocks
    `
    return (await query(sql)).rows[0].height
}

export const qGetEpoch = async () => {
    const sql = `
        select * from v_epoch
    `
    return (await query(sql)).rows[0]
}

export const qGetStat = async () => {
    const sql = `
        select * from v_stat
    `
    return (await query(sql)).rows[0]
}

export const qAddressInfo = async (address) => {
    const sql = `
        select * 
        from v_address
        where public_key = $1
    `
    return (await query(sql, [address])).rows[0]
}

export const qLastBlockTime = async () => {
    const sql = `
        select * 
        from v_last_block_time
    `
    return (await query(sql)).rows[0].timestamp
}

export const qBlockInfo = async (hash) => {
    const sql = `
        select b.*
        from v_blocks b 
        where b.state_hash = $1
    `
    return (await query(sql, [hash])).rows[0]
}

export const qBlockTransactions = async (hash) => {
    if (!hash) {
        throw new Error('You must specified block state hash for this query [qBlockTransactions]')
    }

    const sql = `
        select * from v_trans_all 
        where state_hash = $1
        order by timestamp desc, nonce desc
    `

    const result = (await query(sql, [hash])).rows

    result.map((r) => {
        r.memo = (new TextDecoder().decode(decode(r.memo).slice(3, -4)))
    })

    return result
}

export const getLeaderboard = async (segment, {
    limit = 120,
    offset = 0,
} = {}) => {
    let res, segmentId, segmentTimestamp

    if (!segment) {
        res = await query(`select id, timestamp
                           from uptime_segments
                           where timestamp = (select max(timestamp) from uptime_segments)`)
    } else {
        res = await query(`select id, timestamp
                           from uptime_segments
                           where id = $1`, [segment])
    }

    segmentId = res.rows[0].id
    segmentTimestamp = res.rows[0].timestamp

    res = await query(`
        select u.public_key_id,
               p.value as public_key,
               a.name,
               u.position,
               u.score,
               u.rate,
               (select 1 from blocks b where b.creator_id = u.public_key_id limit 1) as is_producer 
        from uptime u
        left join public_keys p on u.public_key_id = p.id
        left join addresses a on a.public_key_id = u.public_key_id
        where u.segment_id = $1  
        order by u.position
        limit $2 offset $3
    `, [segmentId, limit, offset])

    return {segment: segmentTimestamp, rows: res.rows, next: await getUptimeNext()}
}

export const getUptimeNext = async () => {
    const sql = `select timestamp from uptime_next limit 1`
    return (await query(sql)).rows[0].timestamp
}