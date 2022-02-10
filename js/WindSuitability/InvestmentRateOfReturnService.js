/*
 Copyright 2021 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 *
 * InvestmentRateOfReturnService
 *  - Investment Rate of Return Service
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  1/6/2022 - 0.0.1 -
 * Modified:
 *
 * https://renatos2.esri.com/server/rest/services/IRR_Value2/GPServer/IRR%20Value/Submitjob
 *  - NOTE: CURRENTLY REQUIRES EXTERNAL ACCESS VIA VPN...
 *
 */

class InvestmentRateOfReturnService extends EventTarget {

  static version = '0.0.1';

  static SERVICE_URL = 'https://renatos2.esri.com/server/rest/services/IRR_Value2/GPServer/IRR%20Value/';

  /**
   * @type {MapView}
   */
  view;

  /**
   * @type {{outputMin:number, outputMax:number, InputRanges:number[], OutputValues:number[]}}
   */
  remap;

  /**
   * @type {HTMLElement}
   */
  statusNotice;

  /**
   * @type {HTMLElement}
   */
  jobInfoNode;

  /**
   * @type {string}
   */
  taskName;

  /**
   * @type {number}
   */
  waitInterval;

  /**
   * @type {{interval:number,statusCallback:Function}}
   */
  statusWaitOptions;

  /**
   * @type {boolean}
   */
  serviceAvailable;

  /**
   *
   * @param {MapView} view
   * @param {{outputMin:number, outputMax:number, InputRanges:number[], OutputValues:number[]}} remap
   */
  constructor({view, remap}) {
    super();

    // MAPVIEW //
    this.view = view;
    // REMAP PARAMETERS //
    this.remap = remap;
    // TASK NAME //
    this.taskName = "IRR";
    // WAIT INTERVAL //
    this.waitInterval = 2000;

    // STATUS NOTICE //
    this.statusNotice = document.getElementById('status-notice');
    this.view.ui.add(this.statusNotice, 'top-right');

    // JOB INFO //
    this.jobInfoNode = document.getElementById("job-info");

    // STATUS WAIT OPTIONS //
    this.statusWaitOptions = {
      interval: this.waitInterval,
      statusCallback: this.jobStatusUpdate.bind(this)
    };

    // RESULT OPTIONS //
    this.resultOptions = {};
  }

  /**
   *
   * @returns {Promise<unknown>}
   */
  load() {
    return new Promise((resolve, reject) => {
      if (this.serviceAvailable !== undefined) {
        resolve();
      } else {
        this._ping(InvestmentRateOfReturnService.SERVICE_URL).then(() => {
          this.serviceAvailable = true;
          resolve();
        }).catch(() => {
          this.serviceAvailable = false;
          resolve();
        });
      }
    });
  }

  /**
   *
   */
  jobStatusUpdate(jobInfo) {
    switch (jobInfo.jobStatus) {
      case "job-new":
      case "job-submitted":
      case "job-waiting":
        this.jobInfoNode.innerHTML = `Calculating ${ this.taskName }...`;
        break;
      case "job-executing":
        this.jobInfoNode.innerHTML = `[${ (new Date()).toLocaleTimeString() }] Status: ${ jobInfo.jobStatus.replace(/job-/, "") }...`;
        break;
      case "job-cancelling":
      case "job-cancelled":
      case "job-deleting":
      case "job-deleted":
      case "job-timed-out":
      case "job-failed":
        this.jobInfoNode.innerHTML = JSON.stringify(jobInfo.messages[0].description, null, 2);
        break;
      case "job-succeeded":
        this.jobInfoNode.innerHTML = `${ this.taskName } calculated successfully`;
        break;
      default:
        this.jobInfoNode.innerHTML = "";
    }
  }

  /**
   * RANDOM UPDATES FOR NEW OUTPUT VALUES
   *
   * @returns {Promise<number[]>}
   */
  getRandomRatesByRegion() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // RANDOM UPDATES FOR NEW OUTPUT VALUES //
        const powerPriceMin = this.remap.outputMin;
        const powerPriceMax = this.remap.outputMax;
        const irrValues = this.remap.OutputValues.map(outputValue => {
          return Math.floor(powerPriceMin + (Math.random() * (powerPriceMax - powerPriceMin)));
        });
        resolve({irrValues});
      }, 1500);
    });
  }

  /**
   *
   * @param {Object} powerPriceInputs
   */
  getRatesByRegion(powerPriceInputs) {
    return new Promise((resolve, reject) => {
      if (!this.serviceAvailable) {
        console.info("IRR service not available");
        // IF SERVICE IS NOT AVAILABLE RESOLVE WITH RANDOM VALUES //
        this.getRandomRatesByRegion().then(resolve);

      } else {
        require(["esri/rest/geoprocessor"], (geoprocessor) => {

          this.view.container.style.cursor = "wait";
          this.statusNotice.toggleAttribute('active', true);

          // SUCCESSFUL CALL TO IRR SERVICE //
          const _resolveResults = (irrValues) => {
            console.info("IRR Service Results: ", irrValues);
            this.view.container.style.cursor = "default";
            this.statusNotice.toggleAttribute('active', false);

            //
            // [JG: FOR NOW] ...RESOLVE WITH RANDOM VALUES... //
            //
            this.getRandomRatesByRegion().then(resolve);

            // RESOLVE WITH RATES RETURNED FROM SERVICE //
            //resolve({irrValues});
          }

          /**
           * IF ERROR RESOLVE WITH RANDOM VALUES
           * @param error
           * @private
           */
          const _rejectError = (error) => {
            console.error(error);
            this.view.container.style.cursor = "default";
            this.statusNotice.toggleAttribute('active', false);

            //
            // [JG: FOR NOW] ...IF ERROR RESOLVE WITH RANDOM VALUES... //
            //
            this.getRandomRatesByRegion().then(resolve);

            // REJECT WITH ERROR //
            //reject(error);
          };

          // CALCULATE VIEWSHED //
          geoprocessor.submitJob(InvestmentRateOfReturnService.SERVICE_URL, powerPriceInputs, this.resultOptions).then((jobInfo) => {
            // JOB ID //
            //const jobId = jobInfo.jobId;
            // WAIT FOR TASK TO COMPLETE //
            jobInfo.waitForJobCompletion(this.statusWaitOptions).then(() => {
              // GET RESULTS //
              jobInfo.fetchResultData('DestDataset_JSON', this.resultOptions).then(({value}) => {
                // RETRIEVE VALUES FROM RESULTS JSON FILE //
                fetch(value.url).then(res => {
                  return res.ok ? res.json() : _rejectError(new Error(`Error loading results. HTTP status ${ res.status }: ${ res.statusText }`));
                }).then(irrValues => {
                  _resolveResults(irrValues);
                }).catch(_rejectError);
              }).catch(_rejectError);
            }).catch(_rejectError);
          }).catch(_rejectError);

        });
      }
    });
  }

  /**
   * https://stackoverflow.com/questions/4282151/is-it-possible-to-ping-a-server-from-javascript
   *
   * @param url
   * @param timeout
   * @returns {Promise<boolean>}
   */
  _ping(url, timeout = 3000) {
    return new Promise((resolve, reject) => {
      // const urlRule = new RegExp('(https?|ftp|file)://[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]');
      // if (!urlRule.test(url)) reject(false);
      try {
        fetch(url).then(resolve).catch(reject);
        setTimeout(() => { reject(); }, timeout);
      } catch (e) { reject(); }
    });
  };

}

export default InvestmentRateOfReturnService;
