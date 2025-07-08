const express = require('express')
const http = require('http')
const path = require('path')
const cors = require('cors')
const dotnev = require('dotenv')
const fetch = require('node-fetch')


// app

const app = express()

// use

const pathRes = path.join(__dirname, '../public')
console.log(pathRes)


app.use(express.static(path.join(__dirname, '../public')))


// 

dotnev.config()

// 






const getCurs = async () => {
    try {
        const responce = await fetch(`https://www.cbr-xml-daily.ru/daily_json.js`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
        })

        if (!responce.ok) {
            throw new Error(`Error: ${responce.status}`)
        }

        const data = await responce.json()
        return data

    } catch (error) {
        console.log(error)
    }
}

const getWeather = async () => {
    try {
        const responce = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Ufa&units=metric&appid=${process.env.TOKEN}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
        })

        const data = await responce.json()
        return data
    } catch (error) {
        console.log(error)
    }

}



const result = {

}

const getData = async () => {

    const timeHour = new Date().getHours()
    const timeMin = new Date().getMinutes()
    const date = new Date().toLocaleDateString('ru', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
    const day = new Date().toLocaleDateString('ru', {
        weekday: 'long'
    })


    const time = `${timeHour + 2}:${timeMin}`


    const dataCurs = await getCurs()
    const data = await getWeather()


    result.date = date
    result.day = day
    result.time = time
    result.img = (timeHour+2 >= 6 && timeHour+2 < 18) ? `${process.env.URL}/img/sun.png` : `${process.env.URL}/img/moon.png`
    result.bg = (timeHour+2 >= 6 && timeHour+2 < 18) ? `${process.env.URL}/img/light.png` : `${process.env.URL}/img/dark.png`
    result.rate = Number(dataCurs.Valute.USD.Value.toFixed(2))
    result.weather = Math.floor(data.main.temp_max)


    return result


}



const firstRender = async () => {
    const data = await getData()
    console.log(data)
}


firstRender()










setInterval(async () => {
    const data = await getData();  // обновляем данные
    console.log("Data updated:", data);  // для логирования обновлений
}, 3600000); // 3600000 миллисекунд = 1 час




app.get('/', async (req, res) => {
    res.json(result)
})







const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})



