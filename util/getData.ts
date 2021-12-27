const { Octokit } = require("@octokit/rest")
const { throttling } = require("@octokit/plugin-throttling")
const Csv = require('../models/Csv')
const MyOctokit = Octokit.plugin(throttling)


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

function lowercaseFirstLetter(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

const getAllFiles = async () => {
    console.log('Initializing data scrape')

    try {
      const githubFiles = await octo.repos.getContent({
        owner,
        repo,
        path: 'csse_covid_19_data/csse_covid_19_daily_reports'
      }).then(res => res.data.filter(i => !i.name.endsWith('2020.csv')))

      await Promise.all(githubFiles.map(async ({name, sha}) => {
        try {
          const data = await octo.git.getBlob({
            owner,
            repo,
            file_sha: sha,
            mediaType: {
              format: 'raw'
            }
          }).then(async res => res.data)

          const date = name.replace('.csv', "")

          const output = {
            date,
            data
          }

          const exists = await Csv.findOne({
            date
          })

          if (exists) {
            if (exists.data !== data) {
              await Csv.findOneAndUpdate({
                date
              }, output)
            }
          } else {
            const newCsv = new Csv(output)

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
}

module.exports = getAllFiles