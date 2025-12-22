const express = require('express')
const http = require('http')
const path = require('path')
const cors = require('cors')
const dotnev = require('dotenv')
const fetch = require('node-fetch')
const NodeCache = require('node-cache');
const compression = require('compression');


// app

const app = express()
app.disable('x-powered-by');

// cashe

const cashe = new NodeCache({
    stdTTL: 3600,
    useClones: false,
    maxKeys: 100,
    deleteOnExpire: true,
    checkperiod: 600
})


const cashKeys = {
    curs: 'currency',
    weather: (region) => {
        console.log('выбранный регион ', region)
        return `weather_${region.toLocaleLowerCase().trim()}`
    },
    feels_like: (region) => {
        console.log('выбранный регион ', region)
        return `feels_like_${region.toLocaleLowerCase().trim()}`
    }
}


// use

const pathRes = path.join(__dirname, '../public')


app.use(compression())
app.use(express.json({ limit: '10kb' }));
app.use(express.static('public', {
    maxAge: '1d',
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'public, max-age=86400');
    }
}));


// 

dotnev.config({
    path: path.join(__dirname, '../.env')
})

// regions

const regions = require('../regions.json')

// 

let backgroundUpdateInterval

const startBackgroundCacheUpdater = () => {
    console.log('Запуск фонового обновления кэша...')

    if (backgroundUpdateInterval) {
        clearInterval(backgroundUpdateInterval)
    }
    
    backgroundUpdateInterval = setInterval(async () => {
        try {
            console.log('Фоновое обновление данных...')
            
            // 1. Обновляем курс валют
            try {
                console.log('Обновление курса валют')
                const response = await fetch(`https://www.cbr-xml-daily.ru/daily_json.js`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 5000
                })
                
                if (response.ok) {
                    const data = await response.json()
                    cashe.set(cashKeys.curs, data, 3600)
                    console.log('Курс валют обновлен')
                }
            } catch (error) {
                console.error('Ошибка обновления курса:', error.message)
            }
            
            // 2. Обновляем погоду для всех регионов
            for (const region of regions.data) {
                try {
                    console.log(`Обновление погоды для ${region.city}...`)
                    const response = await fetch(
                        `https://api.openweathermap.org/data/2.5/weather?q=${region.city}&units=metric&appid=${process.env.TOKEN}`,
                        {
                            method: 'GET',
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 5000
                        }
                    )
                    
                    if (response.ok) {
                        const data = await response.json()
                        const weatherKey = cashKeys.weather(region.city)
                        const feelsLikeKey = cashKeys.feels_like(region.city)
                        
                        // Сохраняем полные данные погоды
                        cashe.set(weatherKey, data, 3600)
                        
                        // Можно также сохранить отдельно feels_like если нужно
                        cashe.set(feelsLikeKey, data.main.feels_like, 3600)
                        
                        console.log(`Погода для ${region.city} обновлена`)
                    }
                } catch (error) {
                    console.error(`Ошибка обновления погоды для ${region.city}:`, error.message)
                }
            }
        } catch (error) {
            console.error('Ошибка в фоновом обновлении:', error.message)
        }
    }, 60 * 60 * 1000) // Каждый час
}


const getCurs = async () => {

    const cacheKey = cashKeys.curs;

    const cashedData = cashe.get(cacheKey)
    if (cashedData) {
        console.log('Курс валюты из кэша')
        return cashedData
    }

    console.log('Курс валюты из сети')

    try {
        const responce = await fetch(`https://www.cbr-xml-daily.ru/daily_json.js`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000
        })

        if (!responce.ok) {
            throw new Error(`Error: ${responce.status}`)
        }

        const data = await responce.json()
        cashe.set(cacheKey, data, 3600)
        console.log(`Курс валют сохранен в кэш на 1 час`)

    } catch (error) {
        console.error(`Ошибка получения информации о курсах валют: ${error.message}`)
        throw new Error(`Ошибка получения информации о курсе валют: ${error.message}`)
    }
}

const getWeather = async (city) => {

    const casheKey = cashKeys.weather(city)
    const cashedData = cashe.get(casheKey)

    if (cashedData) {
        console.log(`данные о погоде в городе ${city} из кэша`)
        return cashedData
    }

    console.log(`данные о погоде в городе ${city} из сети`)


    try {
        const responce = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${process.env.TOKEN}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 30000
        })


        const data = await responce.json()
        cashe.set(casheKey, data, 3600)
        console.log(`Погода для ${city} сохранена в кэш на 1 час`)

    } catch (error) {
        console.error(`Ошибка получения информации о погоде: ${error.message}`)
        throw new Error(`Ошибка получения информации о погоде: ${error.message}`)
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
        console.log(`Ошибка получения информации о дате: ${error.message}`)
        throw new Error({
            message: `Ошибка получения информации о дате: ${error.message}`,
            status: 500
        })
    }
}


// endpoint


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
        const currentBg = `${process.env.URL}/img/black.png`


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
        console.log('Ошибка в обработке запроса:', error);
        
        if (!res.headersSent) {
            return res.status(500).json({ 
                error: 'Internal server error',
                message: error.message 
            });
        }


        return res.status(500).json({
            error: {
                message: 'Internal server error',
                status: 500
            }
        })
    }
})




app.get('/:region', async (req, res) => {
    try {

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400')


        const currentRegion = regions.data.find(region => region.name === req.params.region)

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

        const currentIcon = ''
        const currentBg = `${process.env.URL}/img/black.png`


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
            message: `Ошибка запроса данных виджета: ${error.message}`,
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
        const info = getInfo(currentRegion.timeZone)

        res.status(200).json({
            time: info.timeRegion,
        })

    } catch (error) {
        res.status(500).json({
            message: `Ошибка запроса данных виджета: ${error.message}`,
            status: 500
        })
    }
})






const PORT = process.env.PORT || 3000


const startServer = () => {
    try {
        startBackgroundCacheUpdater()
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}\n\nPID: ${process.pid}`)
        })
    } catch (error) {
        console.log(`Ошибка запуска сервера: ${error.message}\n\nPID: ${process.pid}`)
    }
}

startServer()

