const updateScammerList = data => {
    if (!data || !Array.isArray(data)) return

    const table = Metro.getPlugin('#scammer-list-table', 'table')
    table.setData({data})
}

const updateTopStacksList = data => {
    if (!data || !Array.isArray(data)) return

    const table = Metro.getPlugin('#top-stacks-table', 'table')
    table.setData({data})
}

const updateLastBlockWinnersList = data => {
    if (!data || !Array.isArray(data)) return

    const table = Metro.getPlugin('#last-winners-table', 'table')
    table.setData({data})
}

function topStackHoldersTableDrawCell(td, val, idx, head, row, table){
    if (head.name === 'address') {
        td.html(`
            <a class="link" href="/address/${val}">${shorten(val, 12)}</a>
            <div class="text-small text-muted ${row[1] ? 'fg-violet' : ''}">${row[1] || 'Unknown'}</div>
        `)
    }
    if (head.name === 'stake' || head.name === 'stake_next') {
        td.html(`
            ${Number(normMina(val).toFixed(0)).format(0, null, " ", ".")}
        `).addClass('text-right')
    }
}

function lastBlockWinnersTableDrawCell(td, val, idx, head, row, table){
    if (head.name === 'address') {
        td.html(`
            <a class="link" href="/address/${val}">${shorten(val, 12)}</a>
            <div class="text-small text-muted ${row[1] ? 'fg-violet' : ''}">${row[1] || 'Unknown'}</div>
        `)
    }
    if (head.name === 'coinbase') {
        td.html(`
            ${Number(normMina(val).toFixed(0)).format(0, null, " ", ".")}
        `).addClass('text-right')
    }
}

function scammerListDrawCell(td, val, idx, head, row, table){
    if (head.name === 'address') {
        td.html(`
            <a class="link" href="/address/${val}">${shorten(val, 12)}</a>
            <div class="text-small text-muted ${row[1] ? 'fg-violet' : ''}">${row[1] || 'Unknown'}</div>
        `)
    }
}

let currentPage = 1
let recordsOnPage = 50
let searchString = ""
let searchThreshold = 500
let sortBy = 'stake desc'

const getRequestData = () => {
    return {
        count: recordsOnPage,
        offset: recordsOnPage * (currentPage - 1),
        sort: sortBy,
        search: searchString ? {
            key: searchString
        } : null
    }
}

function applyRowsCount(selected){
    recordsOnPage = +selected[0]
    refreshAddressesTable()
}

function applySort(field){
    $("#addresses-table th").removeClass("sortable-column sort-desc sort-asc")
    switch (field) {
        case 'balance': {
            $("#addresses-table th[data-name=balance]").addClass("sortable-column sort-desc")
            sortBy = `${field} desc`
            break
        }
        case 'stake': {
            $("#addresses-table th[data-name=stake]").addClass("sortable-column sort-desc")
            sortBy = `${field} desc`
            break
        }
        case 'uptime_position': {
            $("#addresses-table th[data-name=uptime]").addClass("sortable-column sort-asc")
            sortBy = `${field} asc`
            break
        }
    }

    refreshAddressesTable()
}

function refreshAddressesTable(){
    if (globalThis.webSocket) {
        $("#addresses-table").addClass("disabled")
        $("#load-data-activity").show()
        globalThis.webSocket.send(JSON.stringify({channel: 'addresses', data: getRequestData()}))
    }
}

$("#pagination").on("click", ".page-link", function(){
    $("#pagination").addClass("disabled")
    const val = $(this).data("page")
    if (val === 'next') {
        currentPage++
    } else if (val === 'prev') {
        currentPage--
    } else {
        currentPage = val
    }
    refreshAddressesTable()
})

let search_input_interval = false

const flushSearchInterval = () => {
    clearInterval(search_input_interval)
    search_input_interval = false
}

$("#address-search").on(Metro.events.inputchange, function(){
    searchString = clearText(this.value.trim())

    flushSearchInterval()

    if (!search_input_interval) search_input_interval = setTimeout(function(){
        flushSearchInterval()
        currentPage = 1
        refreshAddressesTable()
    }, searchThreshold)
})

const updateAddressesTable = (data) => {
    const target = $("#addresses-table tbody").clear()

    Metro.pagination({
        target: "#pagination",
        length: data.count,
        rows: recordsOnPage,
        current: currentPage
    })

    $("#found-addresses").html(num2fmt(data.count))

    for(let row of data.addresses) {
        let tr = $("<tr>").appendTo(target)
        const top240 = Metro.utils.between(row.uptime_position, 1, 240, true)
        const inBlackList = !!+row.in_black_list
        const isDelegationProgramParticipant = !!+row.is_delegation_program_participant
        const balance = (normMina(row.balance).toString()).split(".")
        const stake = (normMina(row.stake).toString()).split(".")

        tr.html(`
            <td>
                <div class="d-flex flex-row flex-align-center">
                    <a class="link mr-2" href="/address/${row.public_key}">${shorten(row.public_key, 12)}</a>
                    <span class="ml-1 mif-copy copy-data-to-clipboard c-pointer" title="Copy address to clipboard" data-value="${row.public_key}"></span>
                    <div class="d-flex flex-row flex-align-center mt-1 ml-2">
                        ${inBlackList ? "<span class='radius reduce-4 badge inline bg-darkRed fg-white text-upper' title='Listed in Blacklist'>BL</span>" : ""}            
                        ${top240 ? "<span class='radius reduce-4 badge inline bg-violet fg-white text-upper' title='Top240 by Uptime'>240</span>" : ""}            
                        ${row.is_producer ? "<span class='radius reduce-4 badge inline bg-green fg-white text-upper' title='Block Producer'>BP</span>" : ""}            
                        ${isDelegationProgramParticipant ? "<span class='radius reduce-4 badge inline bg-teal fg-white text-upper' title='Delegation Program Participant'>DP</span>" : ""}
                    </div>
                </div>            
                <div class="d-flex flex-row flex-align-center mt-1">
                    <span class="text-small fg-violet mr-2">${row.name || 'Unknown'}</span>
                </div>
                ${inBlackList ? "<div class='text-small fg-red p-1' title=''>Warning! This address listed in Blacklist</div>" : ""}
            </td>
            <td class="text-right">
                <span>${num2fmt(stake[0])}</span>   
                <div class="text-small text-muted">${stake[1] ? stake[1] : 0 }</div>         
            </td>
            <td class="text-right">
                <span>${num2fmt(balance[0])}</span>
                <div class="text-small text-muted">${balance[1] ? balance[1] : 0}</div>
            </td>
            <td class="text-right">
                <span>${row.uptime_position >= 1000000 ? '<small class="text-muted">not rated</small>' : row.uptime_position}</span>   
            </td>
        `)
    }

    $("#addresses-table").removeClass("disabled")
    $("#pagination").removeClass("disabled")
    $("#load-data-activity").hide()
}

const wsMessageController = (ws, response) => {
    const {channel, data} = response

    if (!channel) {
        return
    }

    const requestLastActivity = () => {
        if (!isOpen(ws)) return
        request('epoch')
        request('last_block_winners', 20)
    }

    const requestNonActiveData = () => {
        request('scammer_list')
        request('top_stack_holders', 20)
        request('addresses', getRequestData())
    }

    switch(channel) {
        case 'welcome': {
            $("#load-data-activity").show()
            requestLastActivity()
            requestNonActiveData()
            break;
        }
        case 'new_block': {
            requestLastActivity()
            break;
        }
        case 'scammer_list': {
            updateScammerList(data)
            break;
        }
        case 'top_stack_holders': {
            updateTopStacksList(data)
            break;
        }
        case 'last_block_winners': {
            updateLastBlockWinnersList(data)
            break;
        }
        case 'addresses': {
            updateAddressesTable(data)
            break;
        }
    }
}