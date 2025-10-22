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

dotnev.config({
    path: path.join(__dirname, '../.env')
})

// regions

const regions = require('../regions.json')


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

const getWeather = async (city) => {
    try {
        const responce = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${process.env.TOKEN}`, {
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

const getInfo = (region) => {
    try {


    const date = new Date()

    const timeRegion = new Intl.DateTimeFormat('ru', {
        timeZone: region,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    }).format(date)


    const dateRegion = new Intl.DateTimeFormat('ru', {
        timeZone: region,
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
    }).format(date)


    return {timeRegion, dateRegion}

        
    } catch (error) {
        console.log(error)
        throw new Error({
            message: 'Error',
            status: 500
        })
    }
}



app.get('/', async (req, res) => {
    try {

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400')



        const info = getInfo('Asia/Yekaterinburg')
        const wetaher = await getWeather('ufa')
        const curs = await getCurs()
        const time = info.timeRegion.split(':')



        const day = info.dateRegion.split(',')[0]
        const date = info.dateRegion.split(',')[1]
  


        const currentIcon = (time[0] >= 6 && time[0] < 18) ? `${process.env.URL}/img/sun.png` : `${process.env.URL}/img/moon.png`

        const currentBg = (time[0] >= 6 && time[0] < 18) ? `${process.env.URL}/img/light.png` : `${process.env.URL}/img/dark.png`


        return res.status(200).json({
            time: info.timeRegion,
            date: info.dateRegion.split(',')[1].trim(),
            day: info.dateRegion.split(',')[0],
            wetaher: Math.floor(wetaher.main.temp),
            feelsLike: Math.ceil(wetaher.main.feels_like),
            img: currentIcon,
            bg: currentBg,
            curs: curs.Valute.USD.Value.toFixed(2)

        })
        
    } catch (error) {
        console.log(error)
    }
})




app.get('/:region', async (req, res) => {
    try {

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400')




        const currentRegion = regions.data.find(region => region.name === req.params.region)
        console.log(currentRegion)

        if (!currentRegion) {
            res.status(404).json({
                message: 'Region not found',
                status: 404
            })
        }

        const info = getInfo(currentRegion.timeZone)
        const wetaher = await getWeather(currentRegion.city)
        const curs = await getCurs()


        const day = info.dateRegion.split(',')[0]
        const date = info.dateRegion.split(',')[1]



        const time = info.timeRegion.split(':')
 


        const currentIcon = (time[0] >= 6 && time[0] < 18) ? `${process.env.URL}/img/sun.png` : `${process.env.URL}/img/moon.png`

        const currentBg = (time[0] >= 6 && time[0] < 18) ? `${process.env.URL}/img/light.png` : `${process.env.URL}/img/dark.png`


        res.status(200).json({
            time: info.timeRegion,
            date: info.dateRegion.split(',')[1].trim(),
            day: info.dateRegion.split(',')[0],
            wetaher: Math.ceil(wetaher.main.temp),
            feelsLike: Math.ceil(wetaher.main.feels_like),
            img: currentIcon,
            bg: currentBg,
            curs: curs.Valute.USD.Value.toFixed(2)

        })
        
    } catch (error) {
        res.status(500).json({
            message: 'Error',
            status: 500
        })
    }
})



app.get('/time/:region', async (req, res) => {
    try {


        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400')

        const currentRegion = regions.data.find(region => region.name === req.params.region)
        console.log(currentRegion)

        const info = getInfo(currentRegion.timeZone)

        res.status(200).json({
            time: info.timeRegion,
        })

    } catch (error) {
        res.status(500).json({
            message: 'Error',
            status: 500
        })
    }
})






const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})



