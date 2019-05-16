const puppeteer = require('puppeteer');
const mongoDB = require('../service/mongoDBHandler')
const program = require('commander');


class spiderHandler {

    constructor() {
        this.host = 'https://bj.lianjia.com'
    }


    async zufangRegionClassify() {
        const browser = await puppeteer.launch({
            headless: true
        });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(480000)

        const _that = this;

        await page.goto(`${this.host}/zufang/`);

        //全部的region信息
        const aRegion = await page.evaluate((_that) => {
            let aRegion = [];
            let elements = document.querySelectorAll('.filter__item--level2  a'); // 获取所有的区域url

            for (let element of elements) { // 循环
                let href = element.getAttribute('href'); // 获取标题
                let region = element.innerText; // 获取价格

                if (region == '不限') {
                    continue;
                } else if (region == '1号线') {
                    //偷个懒，不细分dom过滤掉地铁线部分，直接break
                    break;
                }
                //判断是否有http前缀,没的话加上去
                if (href.indexOf('http') !== 0) {
                    href = _that.host + href
                }
                aRegion.push({
                    href,
                    region
                }); // 存入数组
            }
            return aRegion; // 返回数据
        }, _that)


        //根据region 得到各个sub_region信息
        let aSubRegion = [];
        for (let regionInfo of aRegion) {
            await page.goto(regionInfo.href);
            let aTmp = await page.evaluate((regionInfo, _that) => {
                let aSubRegionInfo = [];
                let elements = document.querySelectorAll('.filter__item--level3 a'); // 获取所有的区域url
                let region = regionInfo.region;

                for (let element of elements) { // 循环

                    let href = element.getAttribute('href');

                    let sub_region = element.innerText;

                    //判断是否有http前缀,没的话加上去
                    if (href.indexOf('http') !== 0) {
                        href = _that.host + href
                    }

                    //有的sub_region跳转链接和region的一样，这种是没数据的
                    if (href == regionInfo.href) {
                        continue;
                    }

                    aSubRegionInfo.push({
                        region,
                        href,
                        sub_region
                    }); // 存入数组
                }


                return aSubRegionInfo;
            }, regionInfo, _that)
            aSubRegion = aSubRegion.concat(aTmp)
        }

        // console.log(aSubRegion)
        // return
        //检验sub_region和region是否对应的上
        for (let item of aSubRegion) {
            //检验方法 跳转到href 看selected的是否和region一样
            await page.goto(item.href);

            let right_region = await page.evaluate(() => {
                let right_region = document.querySelector('.filter__item--level2.strong > a').innerText
                return right_region;
            })
            item.region = right_region
        }

        //过滤掉重复的
        let sub_region_record = {}
        let aRes = [];
        for (let item of aSubRegion) {
            if (sub_region_record[item.sub_region] === undefined) {
                sub_region_record[item.sub_region] = true
                aRes.push(item)
            }
        }

        browser.close();
        mongoDB.insertMany('zufang_sub_region', aRes)
        console.log('complete...')
        return aRes;
    }

    async regionClassify() {
        const browser = await puppeteer.launch({
            headless: false
        });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(480000)

        const _that = this;

        await page.goto(`${this.host}/ershoufang/`);

        //全部的region信息
        const aRegion = await page.evaluate((_that) => {
            let aRegion = [];
            let elements = document.querySelectorAll('.sub_nav.section_sub_nav a'); // 获取所有的区域url

            for (let element of elements) { // 循环
                let href = element.getAttribute('href'); // 获取标题
                let region = element.innerText; // 获取价格

                //判断是否有http前缀,没的话加上去
                if (href.indexOf('http') !== 0) {
                    href = _that.host + href
                }
                aRegion.push({
                    href,
                    region
                }); // 存入数组
            }
            return aRegion; // 返回数据
        }, _that)


        //根据region 得到各个sub_region信息
        let aSubRegion = [];
        for (let regionInfo of aRegion) {
            await page.goto(regionInfo.href);
            let aTmp = await page.evaluate((regionInfo, _that) => {
                let aSubRegionInfo = [];
                let elements = document.querySelectorAll('.sub_sub_nav.section_sub_sub_nav a'); // 获取所有的区域url
                let region = regionInfo.region;

                for (let element of elements) { // 循环

                    let href = element.getAttribute('href');

                    let sub_region = element.innerText;

                    //判断是否有http前缀,没的话加上去
                    if (href.indexOf('http') !== 0) {
                        href = _that.host + href
                    }

                    //有的sub_region跳转链接和region的一样，这种是没数据的
                    if (href == regionInfo.href) {
                        continue;
                    }

                    aSubRegionInfo.push({
                        region,
                        href,
                        sub_region
                    }); // 存入数组
                }

                return aSubRegionInfo;
            }, regionInfo, _that)
            aSubRegion = aSubRegion.concat(aTmp)
        }

        //检验sub_region和region是否对应的上
        for (let item of aSubRegion) {
            //检验方法 跳转到href 看selected的是否和region一样
            await page.goto(item.href);

            let right_region = await page.evaluate(() => {
                let right_region = document.querySelector('.sub_nav.section_sub_nav>.selected').innerText
                return right_region;
            })
            item.region = right_region
        }

        //过滤掉重复的
        let sub_region_record = {}
        let aRes = [];
        for (let item of aSubRegion) {
            if (sub_region_record[item.sub_region] === undefined) {
                sub_region_record[item.sub_region] = true
                aRes.push(item)
            }
        }

        browser.close();

        mongoDB.insertMany('sub_region', aRes)
        return aRes;
    }

    async cmd() {

        await program
            .version('0.1.0')
            .option('-t, --type [type]', '房源类型', '0')
            .option('-r, --region [region]', '区域', '全部')
            .parse(process.argv);

        let type = program.type
        let region = program.region

        if (type == '0') {
            //ershoufang二手房
            if (region == '全部') {
                let aQuery = [{
                    $group: {
                        _id: "$region"
                    }
                }, {
                    $project: {
                        _id: 0,
                        region: "$_id"
                    }
                }];
                let regions = await mongoDB.aggregate('sub_region', aQuery);
                regions.forEach((item) => {
                    this.ershoufangRun(item.region)
                })
            } else {
                this.ershoufangRun(region)
            }

        } else if (type == '1') {
            //zufang租房
            if (region == '全部') {
                let aQuery = [{
                    $group: {
                        _id: "$region"
                    }
                }, {
                    $project: {
                        _id: 0,
                        region: "$_id"
                    }
                }];
                let regions = await mongoDB.aggregate('zufang_sub_region', aQuery);

                regions.forEach((item) => {
                    this.zufangRun(item.region)
                })
            } else {
                this.zufangRun(region)
            }
        } else {
            console.log(`无${type}类型`)
        }
    }

    async zufangRun(region) {
        console.log(region)

        const browser = await puppeteer.launch({
            headless: true
        });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(480000)

        let oQuery = {
            region: region
        };

        //从mongoDB里取出全部的sub_region信息
        let aSubRegion = await mongoDB.find('zufang_sub_region', oQuery);
        let aRes = [];

        for (let subRegionInfo of aSubRegion) {
            await page.goto(subRegionInfo.href);
            //先获得第一页数据 总数(计算分页)
            let aFirstPgInfo = await page.evaluate((subRegionInfo) => {
                let aRes = [];

                let totalElements = document.querySelector('span.content__title--hl').innerText;

                let elements = document.querySelectorAll('.content__list--item--main');

                for (let element of elements) {
                    //判断是否是房源信息class
                    // if (element.querySelector(".title") === null) {
                    //     continue;
                    // }

                    let type = 1; //1:租房
                    let region = subRegionInfo.region;
                    let sub_region = subRegionInfo.sub_region;
                    let title = element.querySelector(".content__list--item--title.twoline>a").innerText; // 获取标题
                    let info_href = 'https://bj.lianjia.com' + element.querySelector(".content__list--item--title.twoline>a").getAttribute('href'); // 获取标题
                    //解析des的数据
                    let desElement = element.querySelector(".content__list--item--des");
                    let desInfo = desElement.innerText
                    let aDes = desElement.innerText.split('/');
                    let area = parseInt(aDes[1].replace(/[^0-9]/ig, ""));
                    let house_type = aDes[3]

                    let bottomInfo = element.querySelector(".content__list--item--bottom.oneline").innerText;

                    //每月的房租
                    let rentPrice = parseInt(element.querySelector(".content__list--item-price>em").innerText);

                    aRes.push({
                        type,
                        region,
                        sub_region,
                        title,
                        info_href,
                        desInfo,
                        area,
                        house_type,
                        bottomInfo,
                        rentPrice
                    }); // 存入数组
                }

                let iTotal = parseInt(totalElements)
                return [aRes, iTotal];
            }, subRegionInfo)

            console.log(`${subRegionInfo.region}-${subRegionInfo.sub_region}-${aFirstPgInfo[1]}`)

            // mongoDB.insertMany('data', aFirstPgInfo[0])
            aRes = aRes.concat(aFirstPgInfo[0])

            //判断页数
            if (aFirstPgInfo[1] > 30) {
                const maxPg = Math.ceil(aFirstPgInfo[1] / 30);

                for (let pg = 2; pg <= maxPg; pg++) {
                    await page.goto(`${subRegionInfo.href}pg${pg}/#contentList`);
                    let aTmp = await page.evaluate((subRegionInfo) => {
                        let data = []; // 初始化空数组来存储数据
                        let region = subRegionInfo.region;
                        let sub_region = subRegionInfo.sub_region;
                        let elements = document.querySelectorAll('.content__list--item--main');
                        for (var element of elements) { // 循环
                            //判断是否是房源信息class
                            // if (element.querySelector(".title") === null) {
                            //     continue;
                            // }
                            let type = 1; //1:租房
                            let title = element.querySelector(".content__list--item--title.twoline>a").innerText; // 获取标题
                            let info_href = element.querySelector(".content__list--item--title.twoline>a").getAttribute('href'); // 获取标题
                            //解析des的数据
                            let desElement = element.querySelector(".content__list--item--des");
                            let desInfo = desElement.innerText
                            let aDes = desElement.innerText.split('/');
                            let area = parseInt(aDes[1].replace(/[^0-9]/ig, ""));
                            let house_type = aDes[3]

                            let bottomInfo = element.querySelector(".content__list--item--bottom.oneline").innerText;

                            //每月的房租
                            let rentPrice = parseInt(element.querySelector(".content__list--item-price>em").innerText);

                            data.push({
                                type,
                                region,
                                sub_region,
                                title,
                                info_href,
                                desInfo,
                                area,
                                house_type,
                                bottomInfo,
                                rentPrice
                            }); // 存入数组
                        }

                        return data; // 返回数据
                    }, subRegionInfo);
                    // mongoDB.insertMany('data', aTmp)
                    aRes = aRes.concat(aTmp)
                }
            }
        }

        //加上时间
        const date = new Date();
        let today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        aRes.forEach((value) => {
            value.date = today
        })

        mongoDB.insertMany('zufang_data', aRes)
        browser.close();
        console.log(`${region}-complete...`)

        return aRes;
    }

    async ershoufangRun(region) {
        console.log(region)

        const browser = await puppeteer.launch({
            headless: true
        });
        const page = await browser.newPage();
        page.setDefaultNavigationTimeout(480000)

        let oQuery = {
            region: region
        };

        //从mongoDB里取出全部的sub_region信息
        let aSubRegion = await mongoDB.find('sub_region', oQuery);
        let aRes = [];

        for (let subRegionInfo of aSubRegion) {
            await page.goto(subRegionInfo.href);
            //先获得第一页数据 总数(计算分页)
            let aFirstPgInfo = await page.evaluate((subRegionInfo) => {
                let aRes = [];
                let totalElements = document.querySelector('.resultDes.clear span').innerText;

                let elements = document.querySelectorAll('.info.clear');

                for (let element of elements) {
                    //判断是否是房源信息class
                    if (element.querySelector(".title") === null) {
                        continue;
                    }
                    let type = 0; //0:二手房
                    let region = subRegionInfo.region; //0:二手房
                    let sub_region = subRegionInfo.sub_region; //0:二手房
                    let title = element.querySelector(".title>a").innerText; // 获取标题
                    let info_href = element.querySelector(".title>a").getAttribute('href'); // 获取标题
                    //解析houseInfo的数据
                    let houseInfoElement = element.querySelector(".address>.houseInfo");
                    let community = houseInfoElement.querySelector('a').innerText
                    let community_href = houseInfoElement.querySelector('a').getAttribute('href')
                    let aHouseInfo = houseInfoElement.innerText.split('/');
                    let house_type = aHouseInfo[1]
                    // let area = parseInt(aHouseInfo[2].replace(/[^0-9]/ig, "")) / 100;
                    let house_position = aHouseInfo[3]
                    let house_level = aHouseInfo[4]
                    let is_lift = aHouseInfo[5]

                    let positionInfo = element.querySelector(".flood>.positionInfo").innerText;

                    //转化成数字 单位:万
                    let totalPrice = parseInt(element.querySelector(".totalPrice span").innerText);
                    //转化成数字 单位: 元/平米
                    let unitPrice = element.querySelector(".unitPrice").innerText;
                    unitPrice = parseInt(unitPrice.replace(/[^0-9]/ig, ""));

                    let area = parseFloat((totalPrice * 10000 / unitPrice).toFixed(2))

                    aRes.push({
                        type,
                        region,
                        sub_region,
                        title,
                        info_href,
                        community,
                        community_href,
                        house_type,
                        area,
                        house_position,
                        house_level,
                        is_lift,
                        positionInfo,
                        totalPrice,
                        unitPrice,
                    }); // 存入数组
                }

                let iTotal = parseInt(totalElements)
                return [aRes, iTotal];
            }, subRegionInfo)

            console.log(`${subRegionInfo.region}-${subRegionInfo.sub_region}-${aFirstPgInfo[1]}`)

            // mongoDB.insertMany('data', aFirstPgInfo[0])
            aRes = aRes.concat(aFirstPgInfo[0])

            //判断页数
            if (aFirstPgInfo[1] > 30) {
                const maxPg = Math.ceil(aFirstPgInfo[1] / 30);

                for (let pg = 2; pg <= maxPg; pg++) {
                    await page.goto(`${subRegionInfo.href}pg${pg}`);
                    let aTmp = await page.evaluate((subRegionInfo) => {
                        let data = []; // 初始化空数组来存储数据
                        let region = subRegionInfo.region;
                        let sub_region = subRegionInfo.sub_region;
                        let elements = document.querySelectorAll('.info.clear');
                        for (var element of elements) { // 循环
                            //判断是否是房源信息class
                            if (element.querySelector(".title") === null) {
                                continue;
                            }
                            let type = 0; //0:二手房
                            let title = element.querySelector(".title>a").innerText; // 获取标题
                            let info_href = element.querySelector(".title>a").getAttribute('href'); // 获取标题
                            //解析houseInfo的数据
                            let houseInfoElement = element.querySelector(".address>.houseInfo");
                            let community = houseInfoElement.querySelector('a').innerText
                            let community_href = houseInfoElement.querySelector('a').getAttribute('href')
                            let aHouseInfo = houseInfoElement.innerText.split('/');
                            let house_type = aHouseInfo[1]
                            // let area = parseInt(aHouseInfo[2].replace(/[^0-9]/ig, "")) / 100;
                            let house_position = aHouseInfo[3]
                            let house_level = aHouseInfo[4]
                            let is_lift = aHouseInfo[5]

                            let positionInfo = element.querySelector(".flood>.positionInfo").innerText;

                            let totalPrice = parseInt(element.querySelector(".totalPrice span").innerText);
                            let unitPrice = element.querySelector(".unitPrice").innerText;
                            unitPrice = parseInt(unitPrice.replace(/[^0-9]/ig, ""));

                            let area = parseFloat((totalPrice * 10000 / unitPrice).toFixed(2))

                            data.push({
                                type,
                                region,
                                sub_region,
                                title,
                                info_href,
                                community,
                                community_href,
                                house_type,
                                area,
                                house_position,
                                house_level,
                                is_lift,
                                positionInfo,
                                totalPrice,
                                unitPrice,
                            }); // 存入数组
                        }

                        return data; // 返回数据
                    }, subRegionInfo);
                    // mongoDB.insertMany('data', aTmp)
                    aRes = aRes.concat(aTmp)
                }
            }
        }

        //加上时间
        const date = new Date();
        let today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        aRes.forEach((value) => {
            value.date = today
        })
        mongoDB.insertMany('data', aRes)
        browser.close();
        console.log(`${region}-complete..`)

        return aRes;
    }
}

console.log('start...');
let handler = new spiderHandler();

handler.cmd();