import octokitRest from "@octokit/rest"
import pluginThrottling from "@octokit/plugin-throttling"
import ParsedCsv from './models/ParsedCsv.js'
import {csvParse, csvFormat} from 'd3-dsv'
import moment from 'moment'
import process from 'process'

import mongoose from 'mongoose'

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI);

		console.log('MongoDB Connected...')
	} catch (err) {
		console.error(err.message)
        process.exit(1)
	}
};


const MyOctokit = octokitRest.Octokit.plugin(pluginThrottling.throttling)


const octo = new MyOctokit({
  throttle: {
    onRateLimit: (retryAfter, options, octokit) => {
      octokit.log.warn(
        `Request quota exhausted for request ${options.method} ${options.url}`
      );

      if (options.request.retryCount === 0) {
        octokit.log.info(`Retrying after ${retryAfter} seconds!`);
        return true;
      }
    },
    onAbuseLimit: (retryAfter, options, octokit) => {
      octokit.log.warn(
        `Abuse detected for request ${options.method} ${options.url}`
      );
    },
  },
  auth: process.env.GITHUB_TOKEN
})

const owner = 'CSSEGISandData'
const repo = 'COVID-19'

const getAllFiles = async () => {
  console.log('Initializing data scrape')

  try {
    await connectDB()

    const githubFiles = await octo.repos.getContent({
      owner,
      repo,
      path: 'csse_covid_19_data/csse_covid_19_daily_reports'
    }).then(res => res.data.filter(i =>  
      i.name.includes('2021') 
      || i.name.includes('2022')
    ))

    await Promise.all(githubFiles.map(async ({name, sha}) => {
      try {
        const data = await octo.git.getBlob({
          owner,
          repo,
          file_sha: sha,
          mediaType: {
            format: 'raw'
          }
        }).then(res => {
          const parsedData = csvParse(res.data, ({
            Country_Region,  
            Last_Update, 
            Lat,
            Long_,
            Confirmed,
            Deaths,
            Combined_Key,
            Incident_Rate,
            Case_Fatality_Ratio
          }) =>  ({
              lat: +Lat,
              lng: +Long_,
              confirmed: +Confirmed,
              deaths: +Deaths,
              fullLocation: Combined_Key,
              country: Country_Region,
              lastUpdate: Last_Update,
              incidentRate: +Incident_Rate,
              caseFatality: +Case_Fatality_Ratio
            }))

          return parsedData
        })
          
        const date = name.replace('.csv', "")
        const lastUpdate = moment.max(data.map(i => moment(i.latestUpdate, "MM-DD-YYYY"))).toString()

        const filteredData = csvFormat(
          data.map(({     
            lastUpdated,
            ...otherProps         
          }) => otherProps).filter(i => i.lat !== 0 && i.lng !== 0)
        )

        const output = {
          date,
          lastUpdate,
          data: filteredData
        }

        const exists = await ParsedCsv.findOne({
          date
        })

        if (exists) {
          await ParsedCsv.findOneAndUpdate({
            date
          }, output)
        } else {
          const newCsv = new ParsedCsv(output)

          console.log('new csv data', date)

          await newCsv.save()
        }
      } catch (err) {
        console.log(err.message)
      }
    }))
  } catch (err) {
    console.log(err.message)
  }

  console.log("Data scrape done")

  return
}

getAllFiles()