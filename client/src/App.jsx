import React, {useEffect, useState, useRef, useMemo, useCallback} from 'react';
import api from './util/api'
import Globe from 'react-globe.gl';
import moment from 'moment-timezone'
import {csvParse} from 'd3-dsv'
import {interpolateYlOrRd, scaleSequentialSqrt} from 'd3'
import {
  Radio, 
  Card, 
  CardContent, 
  createTheme, 
  ThemeProvider, 
  Button, 
  TextField, 
  CircularProgress, 
  Typography, 
  Link,
  Slider,
  ButtonGroup
} from '@mui/material'
import AdapterDate from '@mui/lab/AdapterMoment';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import ErrorIcon from '@mui/icons-material/Error';
import { 
  DatePicker
} from '@mui/lab';
import './App.css'
import {useEffectOnce} from 'react-use'
import globeImg from './globe-img.jpeg'

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function numberWithCommas(x) {
  x = x.toString();
  var pattern = /(-?\d+)(\d{3})/;
  while (pattern.test(x))
      x = x.replace(pattern, "$1,$2");
  return x;
}

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height
  };
}

function App() {
  moment.tz.setDefault("America/New_York");
  const [data, setData] = useState()
  const [filteredData, setFilteredData] = useState()
  const [dateRange, setDateRange] = useState()
  const [date, setDate] = useState(null)
  const [loading, setLoading] = useState({
    dateRange: false,
    data: true,
    filter: false,
    max: false
  })
  const [error, setError] = useState("")
  const [max, setMax] = useState(0)
  const [activeCategory, setActiveCategory] = useState('incidentRate')
  const [activeCountry, setActiveCountry] = useState(null)
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const [altitude, setAltitude] = useState(1)

  const changeAltitude = (_e, num) => {
    startLoading('altitude')
    setAltitude(1 + (1 - num))
    stopLoading('altitude')
  }

  const setMaxNumber = async (data, category) => {
    if (data) {
      startLoading('max')
      const top = data.map(i => i?.[category])
      setMax(Math.max(...top) * altitude)
      stopLoading('max')
    }
  }

  const getDateRange = async () => {
    try {
      startLoading('dateRange')
      const range = await api.get('/data/range').then(res => res.data)

      const latest = range.max

      setDateRange(range)
      setDate(latest)

      stopLoading('dateRange')
      return latest
    } catch (err) {
      stopLoading('dateRange')
      console.error(err)
      setError(err.message)
    }
  }

  const startLoading = (val) => {
    setLoading({
      ...loading,
      [val]: true
    })
  }

  const stopLoading = (val) => {
    setLoading({
      ...loading,
      [val]: false
    })
  } 

  const getConfirmed = async (date) => {
    try {
      startLoading('data')

      const data = await api.get(`/data/${moment(date).format('MM-DD-YYYY')}`)
        .then(async res => csvParse(res.data, ({lat, lng, confirmed, deaths, fullLocation, country, caseFatality, incidentRate}) => ({
        lat: +lat,
        lng: +lng,
        confirmed: +confirmed,
        deaths: +deaths,
        fullLocation,
        country,
        caseFatality: +caseFatality,
        incidentRate: +incidentRate
      })))

      //@ts-ignore
      setData(data)
      setError('')
      stopLoading('data')
    } catch (err) {
      stopLoading('data')
      console.error(err)
      setError(err.message)
    }
  }

  const weightColor = scaleSequentialSqrt(interpolateYlOrRd).domain([0, max]);

  const init = async () => {
    const date = await getDateRange()
    await getConfirmed(date)
  }

  useEffectOnce(() => {
    init()
  })

  const updateFilterData = async () => {
    startLoading('filter')
    const activeCountryFilter = activeCountry ? await data.filter(i => i?.country === activeCountry) : data
    
    setFilteredData(activeCountryFilter)
    setMaxNumber(activeCountryFilter, activeCategory)

    stopLoading('filter')
  }

  useMemo(() => {
    updateFilterData()
  }, [data, activeCategory, activeCountry, altitude])

  const changeCategory = (val) => {
    setActiveCategory(val)
  }

  const changeActiveCountry = (country) => {
    setActiveCountry(country?.country)

    if (country) {
      globeRef.current.controls().autoRotate = false
      globeRef.current.pointOfView({
        lat: country?.lat, 
        lng: country?.lng, 
        altitude: 1.5
      }, 2000)
    } else {
      globeRef.current.pointOfView({
        altitude: 2.5
      }, 2000)
      globeRef.current.controls().autoRotate = true
    }
  }

  const checkDateInRange = (dateToCheck) => {
    return Boolean(moment(dateToCheck).isBetween(dateRange?.min, dateRange?.max, undefined, '[)'))
  }

  const changeDate = async (newDate) => {
    const inRange = checkDateInRange(newDate)

    if (!inRange) {
      return
    }

    setDate(newDate)

    await getConfirmed(newDate)
  }

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [windowDimensions.width]);

  const isMobile = Boolean(windowDimensions.width < 500)
  const sideMargins = isMobile ? 10 : 20


  const customStyles = {
    card: {
      backgroundColor: 'transparent',
      position: 'absolute',
      zIndex: 100
    },
    cardContainter: {
      padding: isMobile ? 10 : 15
    },
    topRight: {
      right: sideMargins,
      top: sideMargins
    },
    radioEl: {
      display: 'flex',
      alignItems: 'center'
    }
  }

  const globeRef = useRef()

  useEffectOnce(() => {
    if (!isMobile) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = .3;
    }
  });

  const isLoading = Object.values(loading).some(i => i)

  const buttons = [
    {
      val: 'incidentRate',
      title: 'Incident Rate'
    },
    {
      val: "confirmed",
      title: "confirmed Cases"
    },
    {
      val: "caseFatality",
      title: "Fatality Rate"
    },
    {
      val: "deaths",
      title: "Deaths"
    }
  ]

  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <Card
          style={{
            ...customStyles.card,
            top: sideMargins,
            left: isMobile ? 0 : sideMargins,
            right: isMobile ? 0 : 'auto',
            marginLeft: 'auto',
            marginRight: 'auto',
            width: 'fit-content'
          }}
          raised
        >
          <div style={{...customStyles.cardContainter}}>
            {
              Boolean(dateRange && date) && 
                <LocalizationProvider dateAdapter={AdapterDate}>
                  <DatePicker
                    // label={moment(date).format('MM-DD-YYYY')}
                    value={date}
                    shouldDisableDate={({_d}) => !checkDateInRange(_d)}
                    onChange={({_d}) => changeDate(_d)}
                    disableCloseOnSelect={false}
                    renderInput={(params) => <TextField {...params} label="Date" disabled value={date} />}
                  />
                </LocalizationProvider>
            }
          </div>
        </Card>

        <div
          style={{
            position: 'absolute',
            top: isMobile ? 'auto' : sideMargins,
            right: isMobile ? 0 : sideMargins,
            left: isMobile ? 0 : 'auto',
            bottom : isMobile ? 75 : 'auto',
            marginLeft: 'auto',
            marginRight: 'auto',
            width: isMobile ? (windowDimensions.width) - (sideMargins * 2) : 'fit-content',
            zIndex: 200,
          }}
        >
          <Card 
            style={{
              ...customStyles.card,
              position: 'static'
            }}
            raised
          >
            <div style={{...customStyles.cardContainter}}>
                <ButtonGroup
                  orientation={isMobile ? 'horizontal' : 'vertical'}
                  size={isMobile ? 'small' : 'medium'}
                  fullWidth={isMobile ? true : false}
                >
                  {
                    buttons.map(({val, title}) => (
                      <Button
                        key={val}
                        variant={activeCategory === val ? "contained" : "outlined"}
                        onClick={() => changeCategory(val)}
                      >
                        {title}
                      </Button>
                    ))
                  }
                </ButtonGroup>
            </div>
          </Card>

          <Card
            style={{
                ...customStyles.card,
                position: 'static',
                marginTop: 10,
                width: '100%',
                display: isMobile ? 'none' : 'block'
            }}
          >
            <div
               style={{...customStyles.cardContainter}}
            >
              <Typography variant="overline">
                Point Variation
              </Typography>
              <Slider
                size="small"
                defaultValue={1}
                step={.2}
                marks
                min={.2}
                max={1}
                onChangeCommitted={changeAltitude}
              />

            </div>
          </Card>
        </div>
        

        <Globe
          ref={globeRef}
          globeImageUrl={globeImg}
          hexLabel={(d) => `${d.points[0]?.fullLocation} ${activeCategory === 'confirmed' 
            ? `| Confirmed Cases | ${numberWithCommas(d.points[0][activeCategory])}`
            : activeCategory === 'deaths' ? `| Deaths | ${numberWithCommas(d.points[0][activeCategory])}` 
            : activeCategory === 'incidentRate' ? ''
            : ''
          }`}
          hexBinPointsData={filteredData}
          hexBinPointWeight={activeCategory}
          //@ts-ignore
          hexAltitude={({sumWeight}) => sumWeight / max}
          hexTopColor={({sumWeight}) => weightColor(sumWeight)}
          hexSideColor={({sumWeight}) => weightColor(sumWeight)}
          onHexClick={({points}) => {
            changeActiveCountry(points[0])
          }}
          hexTopCurvatureResolution={1}
          waitForGlobeReady={true}
          width={windowDimensions.width}
          height={windowDimensions.height}
        />
      </div>


      <Card
        style={{
          ...customStyles.card,
          bottom: isMobile ? 'auto' : sideMargins,
          right: isMobile ? 0 : sideMargins,
          left: isMobile ? 0 : 'auto',
          top: isMobile ? 100 : 'auto',
          marginLeft: 'auto',
          marginRight: 'auto',
          width: isMobile ? '90%' : 'fit-content',
          maxWidth: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: activeCountry ? '100%' : 0, 
          transform: !activeCountry 
            ? isMobile 
              ? 'translate(0px, -100px)' 
              : 'translate(0px, 100px)' 
            : 'translate(0px, 0px)',
          transition: ['transform 100ms', 'opacity 50ms'],
          pointerEvents: Boolean(activeCountry ?? false),
        }}
        raised
      >
        <CardContent>
          Active Country: {activeCountry}
        </CardContent>
        <Button onClick={() => changeActiveCountry(null)}>
          Reset
        </Button>
      </Card>

      <Card
        style={{
          ...customStyles.card,
          position: 'absolute',
          bottom: isMobile ? 200 : sideMargins,
          left: 0, 
          right: 0,
          marginLeft: 'auto',
          marginRight: 'auto',
          width: 'fit-content',
          maxWidth: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: error ? '100%' : 0, 
          transform: !error 
            ? 'translate(0px, 100px)' 
            : 'translate(0px, 0px)',
          transition: ['transform 100ms', 'opacity 50ms'],
          pointerEvents: Boolean(error ?? false)
        }}
        raised
      >
        <div style={{...customStyles.cardContainter, display: 'flex', alignItems: 'center'}}>
          <ErrorIcon style={{marginRight: 20}}/>
          {error}
        </div>
        <Button onClick={() => getConfirmed()}>
          Retry
        </Button>
      </Card>

      <Card
        style={{
          ...customStyles.card,
          position: 'absolute',
          bottom: sideMargins,
          left: isMobile ? 0 : sideMargins,
          right: isMobile ? 0 : 'auto',
          marginLeft: 'auto',
          marginRight: 'auto',
          width: isMobile ? windowDimensions.width - (sideMargins * 2) : 'fit-content',
          textAlign: isMobile ? 'center' : 'left'
        }}
      >
        <div 
          style={{
            ...customStyles.cardContainter,
          }}
        >
          <Typography gutterBottom style={{display: isMobile ? 'none' : 'block'}}>
            COVID 19 GLOBE
          </Typography>
          <div>
            <Typography style={{fontSize: 10}} gutterBottom>
              Data Sourced from <span><Link href="https://github.com/CSSEGISandData/COVID-19" target="_blank">JHU CSSE COVID-19 Data</Link></span>
            </Typography>
            <Typography style={{fontSize: 10, display: isMobile ? 'none' : 'block'}} gutterBottom>
              View <span><Link href="https://github.com/mjguggen/covid-globe" target="_blank">GitHub Repository</Link></span>
            </Typography>
            <Typography style={{fontSize: 10}} gutterBottom>
              Created by <span><Link href="https://mikeguggenbuehl.com/" target="_blank">Mike Guggenbuehl</Link></span>
            </Typography>
          </div>
        </div>
      </Card>

      {
        Boolean(isLoading) && 
          <CircularProgress 
            style={{
              position: 'absolute',
              zIndex: 1000000,
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              margin: 'auto',
              height: 100,
              width: 100
            }} 
          />
      }
    </ThemeProvider>
  );
}

export default App;
