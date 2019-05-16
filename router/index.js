const Koa = require('koa')
const cors = require('koa2-cors')
const Router = require('koa-router')
const mongodb = require("../service/mongoDBHandler"); //引入包
const Until = require("../until/until")



const app = new Koa()
const router = new Router()
app.use(cors())

router.get('/chart', async (ctx, next) => {
    let ctx_query = ctx.query
    const region = ctx.query.region
    const date = Until.strToDate(ctx_query.date)

    let aQuery = []
    if (region == '全部') {
        //按大区域划分
        aQuery = [{
            $match: {
                date: date
            }
        }, {
            $group: {
                _id: "$region",
                total_area: {
                    "$sum": "$area"
                },
                total_price: {
                    "$sum": "$totalPrice"
                },
                count: {
                    "$sum": 1
                }
            }
        }];
    } else {
        aQuery = [{
            $match: {
                date: date,
                region: region
            }
        }, {
            $group: {
                _id: "$sub_region",
                total_area: {
                    "$sum": "$area"
                },
                total_price: {
                    "$sum": "$totalPrice"
                },
                count: {
                    "$sum": 1
                }
            }
        }];
    }
    aQuery = aQuery.concat({
        $project: {
            _id: 0,
            region: "$_id",
            unitPrice: {
                "$divide": ["$total_price", "$total_area"]
            },
            count: 1
        }
    })

    let aRes = await mongodb.aggregate('data', aQuery, {
        unitPrice: 1
    })
    for (let item of aRes) {
        item.unitPrice = parseInt(item.unitPrice * 10000)
    }
    ctx.body = aRes
})

router.get('/dict', async (ctx, next) => {

    let aRes = {};
    let aData = await mongodb.find('sub_region')

    for (let item of aData) {
        if (aRes[item.region] === undefined) {
            aRes[item.region] = [item.sub_region];
        } else {
            aRes[item.region].push(item.sub_region)
        }
    }

    ctx.body = aRes;
})

router.get('/dateChart', async (ctx, next) => {
    let ctx_query = ctx.query
    let st = Until.strToDate(ctx_query.st)
    let ed = Until.strToDate(ctx_query.ed)
    let region = ctx_query.region

    let aQuery = []
    if (region == '全部') {
        aQuery = [{
            $match: {
                date: {
                    $gte: st,
                    $lte: ed
                }
            }
        }, {
            $group: {
                _id: {
                    region: "$region",
                    date: "$date"
                },
                total_area: {
                    "$sum": "$area"
                },
                total_price: {
                    "$sum": "$totalPrice"
                }
            }
        }, {
            $project: {
                _id: 0,
                date: "$_id.date",
                region: "$_id.region",
                unitPrice: {
                    "$divide": ["$total_price", "$total_area"]
                }
            }
        }]
    } else {
        aQuery = [{
            $match: {
                region: {
                    $eq: region
                },
                date: {
                    $gte: st,
                    $lte: ed
                }
            }
        }, {
            $group: {
                _id: {
                    region: "$sub_region",
                    date: "$date"
                },
                total_area: {
                    "$sum": "$area"
                },
                total_price: {
                    "$sum": "$totalPrice"
                }
            }
        }, {
            $project: {
                _id: 0,
                date: "$_id.date",
                region: "$_id.region",
                unitPrice: {
                    "$divide": ["$total_price", "$total_area"]
                }
            }
        }]
    }

    let aRes = await mongodb.aggregate('data', aQuery)

    ctx.body = aRes
})

router.get('/sortTable', async (ctx, next) => {
    const ctx_query = ctx.query
    const region = ctx_query.region
    const date = Until.strToDate(ctx_query.date)
    const show_num = ctx_query.show_num
    const column = ctx_query.column
    const sort = ctx_query.sort
    const min = parseInt(ctx_query.min)
    const max = parseInt(ctx_query.max)
    //模糊查询小区
    const community = ctx_query.community

    let oQuery = {}
    const limit = parseInt(show_num)
    let oSort = {};
    oSort[column] = parseInt(sort)

    oQuery.date = date;
    if (region != '全部') {
        oQuery.region = region
    }

    if (community) {
        oQuery.community = {
            $regex: `${community}`
        }
    }

    oQuery[column] = {
        $gte: min,
        $lte: max
    }

    let aRes = await mongodb.find('data', oQuery, oSort, limit)

    ctx.body = aRes
})

router.get('/community', async (ctx, next) => {
    const ctx_query = ctx.query
    const region = ctx_query.region
    const sub_region = ctx_query.sub_region
    const date = Until.strToDate(ctx_query.date)
    const sort = ctx_query.sort
    const community = ctx_query.community

    let oQuery = {
        date: date
    }

    if (sub_region != '') {
        oQuery.sub_region = sub_region
    } else {
        if (region != '全部') {
            oQuery.region = region
        }
    }

    if (community) {
        oQuery.community = {
            $regex: `${community}`
        }
    }

    let aData = await mongodb.find('data', oQuery)
    let oRes = {};

    for (let item of aData) {
        if (oRes[item.community] != undefined) {
            oRes[item.community].houses = oRes[item.community].houses.concat(item)
        } else {
            oRes[item.community] = {
                community: item.community,
                community_href: item.community_href,
                houses: [item]
            }
        }
    }

    let aRes = [];
    for (let key in oRes) {
        let total_price = 0
        let total_area = 0
        for (let item of oRes[key].houses) {
            total_price += item.totalPrice
            total_area += item.area
        }
        oRes[key].unitPrice = parseInt(total_price / total_area * 10000)

        aRes.push(oRes[key])
    }

    aRes.sort(function (a, b) {
        return a.unitPrice > b.unitPrice ? parseInt(sort) : parseInt(-sort)
    })

    ctx.body = aRes
})

//租房信息接口
router.get('/zufang', async (ctx, next) => {
    const ctx_query = ctx.query
    const region = ctx_query.region
    const sub_region = ctx_query.sub_region
    const date = Until.strToDate(ctx_query.date)
    const sort = ctx_query.sort


    ctx.body = aRes
});

router.get('/zufang_dict', async (ctx, next) => {
    let aRes = {};
    let aData = await mongodb.find('zufang_sub_region')

    for (let item of aData) {
        if (aRes[item.region] === undefined) {
            aRes[item.region] = [item.sub_region];
        } else {
            aRes[item.region].push(item.sub_region)
        }
    }

    ctx.body = aRes;
})

router.get('/zufang_chart', async (ctx, next) => {
    let ctx_query = ctx.query
    const region = ctx.query.region
    const sort = ctx.query.sort
    const date = Until.strToDate(ctx_query.date)

    let aQuery = []
    if (region == '全部') {
        //按大区域划分
        aQuery = [{
            $match: {
                date: date
            }
        }, {
            $group: {
                _id: "$region",
                total_area: {
                    "$sum": "$area"
                },
                total_price: {
                    "$sum": "$rentPrice"
                },
                count: {
                    "$sum": 1
                }
            }
        }];
    } else {
        aQuery = [{
            $match: {
                date: date,
                region: region
            }
        }, {
            $group: {
                _id: "$sub_region",
                total_area: {
                    "$sum": "$area"
                },
                total_price: {
                    "$sum": "$rentPrice"
                },
                count: {
                    "$sum": 1
                }
            }
        }];
    }
    aQuery = aQuery.concat({
        $project: {
            _id: 0,
            region: "$_id",
            unitPrice: {
                "$divide": ["$total_price", "$total_area"]
            },
            count: 1
        }
    })

    let aRes = await mongodb.aggregate('zufang_data', aQuery)
    for (let item of aRes) {
        item.unitPrice = parseInt(item.unitPrice)
    }

    aRes.sort(function (a, b) {
        return a.unitPrice > b.unitPrice ? parseInt(sort) : parseInt(-sort)
    })

    ctx.body = aRes
})

//
router.get('/test', async (ctx, next) => {
    let ctx_query = ctx.query
    const date = Until.strToDate(ctx_query.date)

    let aQuery = [{
        $match: {
            date: date
        }
    }, {
        $group: {
            _id: "$house_type"
        }
    }]

    let aRes = await mongodb.aggregate('zufang_data', aQuery)

    ctx.body = aRes
})

router.get('/zufang_table', async (ctx, next) => {
    const ctx_query = ctx.query
    const region = ctx.query.region
    const sub_region = ctx.query.sub_region
    const max = parseInt(ctx.query.max)
    const min = parseInt(ctx.query.min)
    const sort = ctx.query.sort
    const date = Until.strToDate(ctx_query.date)
    const title = ctx_query.title

    oQuery = {
        date: date,
        rentPrice: {
            $gte: min,
            $lte: max,
        }
    }

    if (sub_region) {
        oQuery.sub_region = sub_region
    } else {
        if (region != '全部') {
            oQuery.region = region
        }
    }

    if (title) {
        oQuery.title = {
            $regex: `${title}`
        }
    }

    let aRes = await mongodb.find('zufang_data', oQuery);

    aRes.sort(function (a, b) {
        return a.rentPrice > b.rentPrice ? parseInt(sort) : parseInt(-sort)
    })

    ctx.body = aRes
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(3001, async () => {
    console.log('start!!!')
})