import React, {useEffect, useState, useRef} from 'react';
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
} from '@mui/material'
import AdapterDate from '@mui/lab/AdapterMoment';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import ErrorIcon from '@mui/icons-material/Error';
import { 
  DatePicker,
  DesktopDatePicker,
  MobileDatePicker
} from '@mui/lab';
import './App.css'


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
  const [loading, setLoading] = useState(true)
  const [maxLoading, setMaxLoading] = useState(false)
  const [filterLoading, setFilterLoading] = useState(false)
  const [dateRangeLoading, setDateRangeLoading] = useState(false)
  const [error, setError] = useState("")
  const [max, setMax] = useState(0)
  const [activeCategory, setActiveCategory] = useState('Confirmed')
  const [activeCountry, setActiveCountry] = useState(null)
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  const setMaxNumber = (data, category) => {
    if (data) {
      setMaxLoading(true)
      const top = data.map(i => parseInt(i?.[category]))
      setMax(Math.max(...top))
      setMaxLoading(false)
    }
  }

  const getDateRange = async () => {
    try {
      setDateRangeLoading(true)
      const range = await api.get('/data/range').then(res => res.data)

      setDateRange(range)
      setDate(range.max)
      setDateRangeLoading(false)

      return range.max
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  const getConfirmed = async (date) => {
    try {
      setLoading(true)

      const data = await api.get(`/data/${date}`).then(async res => csvParse(res.data.data))

      //@ts-ignore
      setData(data)
      setError('')
      setLoading(false)
    } catch (err) {
      setLoading(false)
      console.error(err)
      setError(err.message)
    }
  }

  const weightColor = scaleSequentialSqrt(interpolateYlOrRd).domain([0, max]);

  const init = async () => {
    const date = await getDateRange()
    await getConfirmed(date)
  }

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    updateFilterData()
  }, [data, activeCategory, activeCountry])

  const updateFilterData = async() => {
    setFilterLoading(true)
    const activeCountryFilter = activeCountry ? data.filter(i => i["Country_Region"] === activeCountry) : data
    
    setFilteredData(activeCountryFilter)
    setMaxNumber(activeCountryFilter, activeCategory)

    setFilterLoading(false)
  }

  const changeCategory = (e) => {
    setActiveCategory(e.target.value)
  }

  const changeActiveCountry = (country) => {
    setActiveCountry(country?.["Country_Region"])

    if (country) {
      globeRef.current.controls().autoRotate = false
      globeRef.current.pointOfView({
        lat: country["Lat"], 
        lng: country["Long_"], 
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
    const formattedNewDate = moment(dateToCheck).format('MM-DD-YYYY')
    return Boolean(moment(formattedNewDate).isBetween(dateRange?.min, dateRange?.max, undefined, '[]'))
  }

  const changeDate = async(newDate) => {
    const inRange = checkDateInRange(newDate)

    if (!inRange) {
      return
    }

    const formattedDate = moment(newDate).format('MM-DD-YYYY')

    setDate(formattedDate)

    await getConfirmed(formattedDate)
  }

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = Boolean(windowDimensions.width < 500)
  const sideMargins = isMobile ? 10 : 20


  const customStyles = {
    card: {
      backgroundColor: 'transparent',
    },
    radioContainer: {
      position: 'absolute',
      zIndex: 100,
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

  useEffect(() => {
    globeRef.current.controls().autoRotate = true;
    globeRef.current.controls().autoRotateSpeed = .5;
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        <Card
          style={{
            ...customStyles.radioContainer, 
            ...customStyles.card,
            top: sideMargins,
            left: isMobile ? 0 : sideMargins,
            right: isMobile ? 0 : 'auto',
            width: 200,
            marginLeft: 'auto',
            marginRight: 'auto',
            display: isMobile ? 'none' : 'block'
          }}
          raised
        >
          <div style={{...customStyles.cardContainter}}>
            <LocalizationProvider dateAdapter={AdapterDate}>
              {
                isMobile
                  ?
                    <MobileDatePicker
                      label={date}
                      value={date}
                      shouldDisableDate={({_d}) => !checkDateInRange(_d)}
                      onChange={({_d}) => changeDate(moment(_d).format('MM-DD-YYYY'))}
                      renderInput={(params) => !dateRange ? <CircularProgress/> : <TextField {...params} label="Date" />}
                    />
                  : 
                    <DesktopDatePicker
                      label={date}
                      value={date}
                      shouldDisableDate={({_d}) => !checkDateInRange(_d)}
                      onChange={({_d}) => changeDate(moment(_d).format('MM-DD-YYYY'))}
                      renderInput={(params) => !dateRange ? <CircularProgress/> : <TextField {...params} label="Date" disabled />}
                    />
              }

            </LocalizationProvider>
          </div>
        </Card>

        <Card 
          style={{
            ...customStyles.radioContainer, 
            ...customStyles.topRight, 
            ...customStyles.card,
            display: isMobile ? 'none' : 'block'
          }}
          raised
        >
          <div style={{...customStyles.cardContainter}}>
            <div style={customStyles.radioEl}>
              <Radio
                checked={activeCategory === "Confirmed"}
                onChange={changeCategory}
                value="Confirmed"
              />
              <Typography style={{fontSize: isMobile ? 10 : 12}}>
                Confirmed Cases
              </Typography>
            </div>

            <div style={customStyles.radioEl}>
              <Radio
                checked={activeCategory === "Deaths"}
                onChange={changeCategory}
                value="Deaths"
              />
              <Typography style={{fontSize: isMobile ? 10 : 12}}>
                Deaths
              </Typography>
            </div>

          </div>
        </Card>
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          hexLabel={(d) => `
            <div className="label" style={{color: 'red'}}>${d.points[0]["Combined_Key"]} | ${numberWithCommas(d.points[0][activeCategory])} </div>
          `}
          hexBinPointsData={filteredData}
          hexBinPointWeight={activeCategory}
          hexBinPointLat="Lat"
          hexBinPointLng="Long_"
          //@ts-ignore
          hexAltitude={({sumWeight}) => sumWeight / max}
          hexTopColor={({sumWeight}) => weightColor(sumWeight)}
          hexSideColor={({sumWeight}) => weightColor(sumWeight)}
          onHexClick={({points}) => {
            changeActiveCountry(points[0])
          }}
          waitForGlobeReady={true}
          width={windowDimensions.width}
          height={windowDimensions.height}
        />
      </div>

      <Card
        style={{
          ...customStyles.card,
          position: 'absolute',
          bottom: isMobile ? 'auto' : sideMargins,
          right: isMobile ? 0 : sideMargins,
          left: isMobile ? 0 : 'auto',
          top: isMobile ? sideMargins : 'auto',
          marginLeft: 'auto',
          marginRight: 'auto',
          width: 'fit-content',
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
          bottom: isMobile ? 125 : sideMargins,
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
          width: 'fit-content',
          maxWidth: 300
        }}
      >
        <div style={{...customStyles.cardContainter}}>
          <Typography gutterBottom>
            COVID 19 GLOBE
          </Typography>
          <Typography style={{fontSize: 10}} gutterBottom>
            Data Sourced from <span><Link href="https://github.com/CSSEGISandData/COVID-19" target="_blank">JHU CSSE COVID-19 Data</Link></span>
          </Typography>
          <Typography style={{fontSize: 10}} gutterBottom>
            View <span><Link href="https://github.com/mjguggen/covid-globe" target="_blank">GitHub Repository</Link></span>
          </Typography>
          <Typography style={{fontSize: 10}} gutterBottom>
            Created by <span><Link href="https://mikeguggenbuehl.com/" target="_blank">Mike Guggenbuehl</Link></span>
          </Typography>
        </div>
      </Card>

      {
        Boolean(loading || maxLoading || filterLoading) && 
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
