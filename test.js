const mongoDB = require('./service/mongoDBHandler')
const Until = require("./until/until")


//删除指定日期的数据

function del(date) {
    date = Until.strToDate(date)

    mongoDB.del('zufang_data', {
        date: date
    })
}

del('2019-05-04');