class Until {

    static strToDate(sDate) {
        let date = sDate.split("-")
        date = new Date(parseInt(date[0]), parseInt(date[1]) - 1, parseInt(date[2]) + 1)
        return date
    }
}


module.exports = Until;