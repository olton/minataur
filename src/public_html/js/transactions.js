let currentPage = 1
let recordsOnPage = 20
let chainStatus = ['applied', 'failed']
let chainType = ['payment', 'delegation']
let searchString = ""
let searchThreshold = 500
let includePending = true

const updateTransStat = data => {
    const {tr_total = 0, tr_applied = 0, tr_failed = 0, pool = 0} = data || {}

    $("#trans-total").html((+tr_total).format(0, null, " ", "."))
    $("#trans-applied").html((+tr_applied).format(0, null, " ", "."))
    $("#trans-failed").html((+tr_failed).format(0, null, " ", "."))
    $("#trans-pool").html((+pool).format(0, null, " ", "."))
}

const updateTransTable = data => {
    $("#found-transactions").html(Number(data.count).format(0, null, " ", "."))

    Metro.pagination({
        target: "#pagination",
        length: data.count,
        rows: recordsOnPage,
        current: currentPage
    })

    const target = $("#trans-table tbody").clear()

    for(let t of data.transactions) {
        let tr = $("<tr>").appendTo(target)
        tr.html(`
            <td class="text-center">
                <span class="${t.status === 'pending' ? 'mif-broadcast fg-orange' : t.status === 'applied' ? 'mif-checkmark fg-green' : 'mif-blocked fg-red'}"></span>            
            </td>
            <td>
                <div style="line-height: 1">
                    ${t.status === 'pending' ? '<span class="bg-orange fg-white pl-1 pr-1 reduce-4">PENDING</span>' : ''}
                    <span class="${t.status === 'pending' ? 'ml-2-minus' : ''} ${t.type === 'payment' ? 'bg-blue' : 'bg-pink'} fg-white pl-1 pr-1 reduce-4 text-upper">${t.type}</span>
                    ${t.type === 'payment' && +t.scam && +t.amount > 0 ? '<span class="ml-2-minus bg-red fg-white pl-1 pr-1 reduce-4">SCAM</span>' : ''}
                    ${t.type === 'payment' && +t.scam && +t.amount == 0 ? '<span class="ml-2-minus bg-red fg-white pl-1 pr-1 reduce-4">SPAM</span>' : ''}
                </div>
                <a class="link" href="/transaction/${t.hash}">${shorten(t.hash, 12)}</a><span class="ml-2 text-small text-muted" title="Nonce">[${t.nonce}]</span>
                <span class="ml-1 mif-copy copy-data-to-clipboard c-pointer" title="Copy hash to clipboard" data-value="${t.hash}"></span>                
                <div class="text-small text-muted">
                    <span>${datetime(+t.timestamp).format(config.format.datetime)}</span>
                </div>      
                <div class="text-small text-muted">
                    ${t.memo ? "<span class='reduce-2 bg-darkGray fg-white pl-1 pr-1 mr-1'>MEMO:</span>" + t.memo : ""}
                </div>            
                ${t.status === 'failed' ? '<div class="fg-red">'+t.failure_reason+'</div>' : ''}                   
            </td>
            <td class="text-center">
                <span>${t.height}</span>            
                <div class="text-small text-muted">
                    <span>${datetime(+t.timestamp).timeLapse()}</span>
                </div>      
            </td>
            <td>
                <div class="row">
                    <div class="mr-2">
                        <span class="ml-2 mt-2 mif-move-down mif-2x"></span>                
                    </div>
                    <div>
                        <div>
                            <a data-role="hint" data-hint-text="${t.trans_owner_name || 'Unknown'}" class="link" href="/address/${t.trans_owner}">${shorten(t.trans_owner, 12)}</a>
                            <span class="ml-1 mif-copy copy-data-to-clipboard c-pointer" title="Copy hash to clipboard" data-value="${t.trans_owner}"></span>
                            <div class="text-muted text-small">${t.trans_owner_name || ''}</div>
                        </div>
                        <div>
                            <a data-role="hint" data-hint-text="${t.trans_receiver_name || 'Unknown'}" class="link" href="/address/${t.trans_receiver}">${shorten(t.trans_receiver, 12)}</a>
                            <span class="ml-1 mif-copy copy-data-to-clipboard c-pointer" title="Copy hash to clipboard" data-value="${t.trans_receiver}"></span>
                            <div class="text-muted text-small">${t.trans_receiver_name || ''}</div>
                        </div>     
                    </div>            
                </div>
            </td>
            <td class="text-right">
                <span>${normMina(t.amount)}</span>            
                <div class="text-small text-muted">
                    <span>${normMina(t.fee)}</span>
                </div>      
            </td>
            <td class="text-center">
                <span>${t.confirmation}</span>            
            </td>
        `)
    }

    $("#pagination").removeClass("disabled")
    $("#trans-table").removeClass("disabled")
    $("#load-data-activity").hide()
}

const getRequestData = () => {

    const isTransHash = searchString.substring(0, 2) === "Ckp"
    const isBlockHash = searchString.substring(0, 2) === "3N"
    const isBlockNumb = !isNaN(+searchString)

    return {
        type: chainType,
        status: chainStatus,
        count: recordsOnPage,
        offset: recordsOnPage * (currentPage - 1),
        pending: includePending,
        search: searchString ? {
            block: isBlockNumb ? +searchString : null,
            block_hash: isBlockHash ? searchString : null,
            hash: isTransHash ? searchString : null,
            participant: !isBlockNumb && !isTransHash && !isBlockHash ? searchString : null
        } : null
    }
}

function refreshTransTable(){
    // $("#trans-table").addClass("disabled")
    $("#load-data-activity").show()
    if (globalThis.webSocket) {
        globalThis.webSocket.send(JSON.stringify({channel: 'transactions', data: getRequestData()}))
    }
}

function applyRowsCount(selected){
    recordsOnPage = +selected[0]
    refreshTransTable()
}

function applyFilter(el, state) {
    const [filter, value] = state.split(":")

    if (value !== 'pending') {
        if (!el.checked) {
            if (filter === 'type') {
                Metro.utils.arrayDelete(chainType, value)
            } else {
                Metro.utils.arrayDelete(chainStatus, value)
            }
        } else {
            if (filter === 'type') {
                if (!chainType.includes(state)) chainType.push(value)
            } else {
                if (!chainStatus.includes(state)) chainStatus.push(value)
            }
        }
    } else {
        includePending = el.checked
    }

    refreshTransTable()
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
    $("#load-data-activity").show()
    refreshTransTable()
})

let trans_search_input_interval = false

const flushTransSearchInterval = () => {
    clearInterval(trans_search_input_interval)
    trans_search_input_interval = false
}

$("#transactions-search").on(Metro.events.inputchange, function(){
    searchString = clearText(this.value.trim())

    flushTransSearchInterval()

    if (!trans_search_input_interval) trans_search_input_interval = setTimeout(function(){
        flushTransSearchInterval()
        currentPage = 1
        refreshTransTable()
    }, searchThreshold)
})

const drawTransFeesLine = data => {
    if (!data || !data.length) return

    const _data = data.reverse()
    const points_avg = []
    const points_max = []
    const points_min = []

    let minY1 = 0, minY2 = 0, minY3 = 0,
        maxY1 = 0, maxY2 = 0, maxY3 = 0

    for(let r of _data){
        const time = datetime(r.time).time()
        const avg_fee = +r.avg_fee
        const max_fee = +r.max_fee
        const min_fee = +r.min_fee

        points_avg.push([time, avg_fee])
        points_max.push([time, max_fee])
        points_min.push([time, min_fee])

        // console.log(avg_fee, min_fee, max_fee)

        if (maxY1 < avg_fee) maxY1 = avg_fee
        if (maxY2 < max_fee) maxY2 = max_fee
        if (maxY3 < min_fee) maxY3 = min_fee
    }

    const ids = ["#avg-fees-graph", "#max-fees-graph", "#min-fees-graph"]

    const max = [
        maxY1, maxY2, maxY3
    ]

    const min = [
        minY1, minY2, minY3
    ]

    const colors = [
        Metro.colors.toRGBA('#00AFF0', .5),
        Metro.colors.toRGBA('#d70000', .5),
        Metro.colors.toRGBA('#47bd0c', .5)
    ]

    const areas = [
        {
            name: "AVG FEE",
            dots: {
                size: 2
            }
        },
        {
            name: "MAX FEE",
            dots: {
                size: 2
            }
        },
        {
            name: "MIN FEE",
            dots: {
                size: 2
            }
        }
    ]

    const points = [
        points_avg,
        points_max,
        points_min,
    ]

    let index = 0
    for(let id of ids) {
        chart.areaChart(id, [points[index]], {
            ...areaDefaultOptions,
            legend: false,
            areas: [
                areas[index]
            ],
            boundaries: {
                minY: min[index],
                maxY: index === 2 ? max[index] * 2 : max[index]
            },
            padding: {
                top: 15,
                left: 50,
                right: 15,
                bottom: 40
            },
            height: 145,
            colors: [colors[index]],
            axis: {
                x: {
                    label: {
                        count: 10,
                        angle: -45,
                        shift: {
                            y: 10
                        },
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    label: {
                        align: "left",
                        shift: {
                            x: -35,
                            y: -6
                        },
                        font: {
                            size: 10
                        }
                    }
                }
            },
            onTooltipShow: (d) => {
                return `
                    <span class="text-bold">
                        ${(d[1]/10**9)} 
                        <small class="text-light">MINA</small>
                        ${(datetime(d[0]).format("MMM, DD"))}
                    </span>
                `
            },
            onDrawLabelX: (v) => datetime(+v).format("MMM, DD"),
            onDrawLabelY: (v) => (v/10**9).toFixed(5)
        })
        index++
    }
}

const wsMessageController = (ws, response) => {
    const {channel, data} = response

    if (!channel) {
        return
    }

    const requestStat = () => {
        if (isOpen(ws)) {
            request('trans_stat')
            request('trans_fees_line')
            refreshTransTable()
        }

        setTimeout(requestStat, 60000)
    }

    switch(channel) {
        case 'welcome': {
            requestStat()
            break;
        }
        case 'new_block': {
            break;
        }
        case 'transactions': {
            updateTransTable(data)
            break;
        }
        case 'trans_stat': {
            updateTransStat(data)
            break;
        }
        case 'trans_pool': {
            // console.log(data)
            break;
        }
        case 'trans_fees_line': {
            // console.log(data)
            drawTransFeesLine(data)
            break;
        }
    }
}
