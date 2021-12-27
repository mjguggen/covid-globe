import React, {useEffect, useState, useRef} from 'react';
import api from './util/api'
import Globe from 'react-globe.gl';
import moment from 'moment'
import {csvParse} from 'd3-dsv'
import {interpolateYlOrRd, scaleSequentialSqrt} from 'd3'
import {Radio, Card, CardContent, createTheme, ThemeProvider, Button, TextField, CircularProgress } from '@mui/material'
import AdapterDate from '@mui/lab/AdapterMoment';
import LocalizationProvider from '@mui/lab/LocalizationProvider';
import ErrorIcon from '@mui/icons-material/Error';
import { DatePicker} from '@mui/lab';
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


function App() {
  const today = moment().subtract(1, 'days').format('MM-DD-YYYY')

  const [data, setData] = useState()
  const [filteredData, setFilteredData] = useState()
  const [date, setDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [max, setMax] = useState(0)
  const [activeCategory, setActiveCategory] = useState('Confirmed')
  const [activeCountry, setActiveCountry] = useState(null)

  const setMaxNumber = (data, category) => {
    const top = data.map(i => parseInt(i?.[category]))
    setMax(Math.max(...top))
  }

  const getConfirmed = async () => {
    try {
      setLoading(true)

      const data = await api.get(`/data/${date}`).then(res => {
        return csvParse(res.data.data)
      })

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
  
  useEffect(() => {
    getConfirmed()
  }, [date])

  useEffect(() => {
    updateFilterData()
  }, [data, activeCategory, activeCountry])

  const updateFilterData = async() => {
    setLoading(true)
    const activeCountryFilter = activeCountry ? data.filter(i => i["Country_Region"] === activeCountry) : data
    
    setFilteredData(activeCountryFilter)
    setMaxNumber(activeCountryFilter, activeCategory)

    setLoading(false)
  }

  const changeCategory = (e) => {
    setActiveCategory(e.target.value)
  }

  const changeActiveCountry = (country) => {
    setActiveCountry(country?.["Country_Region"])

    if (country) {
      globeRef.current.controls().autoRotate = false
      globeRef.current.pointOfView(
        {lat: country["Lat"], 
        lng: country["Long_"], 
        altitude: 1.5
      }, 2000)
    } else {
      globeRef.current.controls().autoRotate = true
    }
  }

  const checkDateInRange = (dateToCheck) => {
    const formattedNewDate = moment(dateToCheck).format('MM-DD-YYYY')
    return Boolean(moment(formattedNewDate).isBetween('01-01-2021', today, undefined, '[]'))
  }

  const changeDate = (newDate) => {
    // check if date is within range
    const inRange = checkDateInRange(newDate)

    if (!inRange) {
      return
    }

    setDate(moment(newDate).format('MM-DD-YYYY'))
  }

  const sideMargins = 20

  const customStyles = {
    radioContainer: {
      position: 'absolute',
      zIndex: 100,
    },
    topLeft: {
      left: sideMargins,
      top: sideMargins
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
          style={{...customStyles.radioContainer, ...customStyles.topLeft}}
          raised
        >
          <CardContent>
            <LocalizationProvider dateAdapter={AdapterDate}>
              <DatePicker
                label={date}
                value={date}
                shouldDisableDate={({_d}) => !checkDateInRange(_d)}
                onChange={({_d}) => changeDate(moment(_d).format('MM-DD-YYYY'))}
                renderInput={(params) => <TextField {...params} disabled />}
              />
            </LocalizationProvider>
          </CardContent>
        </Card>

        <Card 
          style={{...customStyles.radioContainer, ...customStyles.topRight}}
          raised
        >
          <CardContent>
            <div style={customStyles.radioEl}>
              <Radio
                checked={activeCategory === "Confirmed"}
                onChange={changeCategory}
                value="Confirmed"
              />
              <div>
                Confirmed Cases
              </div>
            </div>

            <div style={customStyles.radioEl}>
              <Radio
                checked={activeCategory === "Deaths"}
                onChange={changeCategory}
                value="Deaths"
              />
              <div>
                Deaths
              </div>
            </div>

          </CardContent>
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
        />
      </div>

      <Card
        style={{
          position: 'absolute',
          bottom: sideMargins,
          right: sideMargins,
          width: 'fit-content',
          maxWidth: 400,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: activeCountry ? '100%' : 0, 
          transform: !activeCountry ? 'translate(0px, 100px)' : 'translate(0px, 0px)',
          transition: ['transform 100ms', 'opacity 50ms'],
          pointerEvents: Boolean(activeCountry ?? false)
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
          position: 'absolute',
          bottom: sideMargins,
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
          transform: !error ? 'translate(0px, 100px)' : 'translate(0px, 0px)',
          transition: ['transform 100ms', 'opacity 50ms'],
          pointerEvents: Boolean(error ?? false)
        }}
        raised
      >
        <CardContent style={{display: 'flex', alignItems: 'center'}}>
          <ErrorIcon style={{marginRight: 20}}/>
          {error}
        </CardContent>
        <Button onClick={() => getConfirmed()}>
          Retry
        </Button>
      </Card>

      {
        loading && 
          <CircularProgress 
            style={{
              position: 'absolute',
              zIndex: 100,
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