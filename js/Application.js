/*
 Copyright 2020 Esri

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

import AppBase from "./support/AppBase.js";
import AppLoader from "./loaders/AppLoader.js";

import SuitabilitySource from "./WindSuitability/SuitabilitySource.js";
import SuitabilityGeographicVariablesGroup from "./WindSuitability/SuitabilityGeographicVariablesGroup.js";
import SuitabilityIRRGroup from "./WindSuitability/SuitabilityIRRGroup.js";
import InvestmentRateOfReturnService from "./WindSuitability/InvestmentRateOfReturnService.js";

class Application extends AppBase {

  // PORTAL //
  portal;

  /**
   * @type {SuitabilitySource|SuitabilityGeographicVariablesGroup|SuitabilityIRRGroup}
   */
  suitabilitySources;

  /**
   *
   */
  constructor() {
    super();

    // LOAD APPLICATION BASE //
    super.load().then(() => {

      // APPLICATION LOADER //
      const applicationLoader = new AppLoader({app: this});
      applicationLoader.load().then(({portal, group, map, view}) => {
        //console.info(portal, group, map, view);

        // PORTAL //
        this.portal = portal;

        // APP TITLE //
        this.title = this.title || map?.portalItem?.title || 'Application';
        // APP DESCRIPTION //
        this.description = this.description || map?.portalItem?.description || group?.description || '...';

        // USER SIGN-IN //
        this.configUserSignIn();

        // APPLICATION //
        this.applicationReady({portal, group, map, view}).catch(this.displayError).then(() => {
          // HIDE APP LOADER //
          document.getElementById('app-loader').removeAttribute('active');
        });

      }).catch(this.displayError);
    }).catch(this.displayError);

  }

  /**
   *
   */
  configUserSignIn() {
    if (this.oauthappid || this.portal?.user) {

      const signIn = document.getElementById('sign-in');
      signIn && (signIn.portal = this.portal);

    }
  }

  /**
   *
   * @param view
   */
  configView(view) {
    return new Promise((resolve, reject) => {
      if (view) {
        require([
          'esri/widgets/Home',
          'esri/widgets/LayerList',
          'esri/widgets/Legend'
        ], (Home, LayerList, Legend) => {

          //
          // CONFIGURE VIEW SPECIFIC STUFF HERE //
          //
          view.set({
            constraints: {snapToZoom: false},
            qualityProfile: "high"
          });

          // HOME //
          const home = new Home({view});
          view.ui.add(home, {position: 'top-left', index: 0});

          // LEGEND //
          /*
           const legend = new Legend({ view: view });
           view.ui.add(legend, {position: 'bottom-left', index: 0});
           */

          // LAYER LIST //
          const layerList = new LayerList({
            container: 'layer-list-container',
            view: view,
            visibleElements: {statusIndicators: true}
          });

          // VIEW UPDATING //
          this.disableViewUpdating = false;
          const viewUpdating = document.getElementById('view-updating');
          view.ui.add(viewUpdating, 'bottom-right');
          this._watchUtils.init(view, 'updating', updating => {
            (!this.disableViewUpdating) && viewUpdating.toggleAttribute('active', updating);
          });

          resolve();
        });
      } else { resolve(); }
    });
  }

  /**
   *
   * @param {Portal} portal
   * @param {PortalGroup} group
   * @param {EsriMap} map
   * @param {MapView} view
   * @returns {Promise}
   */
  applicationReady({portal, group, map, view}) {
    return new Promise(async (resolve, reject) => {
      // VIEW READY //
      this.configView(view).then(() => {

        // LOAD SUITABILITY CONFIG //
        this.loadSuitabilityConfig().then((suitabilityParameters) => {

          // INITIALIZE ANALYSIS //
          this.initializeWindSuitabilityAnalysis(view).then(() => {

            /**
             * SUITABILITY SOURCES
             *
             * @type {SuitabilitySource | SuitabilityGeographicVariablesGroup | SuitabilityIRRGroup}
             */
            this.suitabilitySources = suitabilityParameters.groups.map(suitabilityGroupInfo => {

              let suitabilitySource;

              switch (suitabilityGroupInfo.name) {
                case 'power':
                  suitabilitySource = new SuitabilitySource(suitabilityGroupInfo);
                  break;

                case 'geog_vars':
                  suitabilitySource = new SuitabilityGeographicVariablesGroup(suitabilityGroupInfo);
                  break;

                case 'irr':
                  const irrService = new InvestmentRateOfReturnService({view, remap: suitabilityGroupInfo.remap});
                  suitabilitySource = new SuitabilityIRRGroup({irrService, ...suitabilityGroupInfo});
                  break;
              }

              suitabilitySource.addEventListener('parameters-change', () => {
                this.updateSuitabilityAnalysis();
              });

              return suitabilitySource;
            });

            const suitabilityGroupsContainer = document.getElementById('suitability-groups-container');
            suitabilityGroupsContainer.append(...this.suitabilitySources);

            this.updateSuitabilityAnalysis();

            resolve();
          }).catch(reject);
        }).catch(reject);
      }).catch(reject);
    });
  }

  /**
   *
   * @returns {Promise<Object>}
   */
  loadSuitabilityConfig() {
    return new Promise((resolve, reject) => {
      fetch('./config/suitabilityParameters.json').then(res => {
        return res.ok ? res.json() : reject(new Error(`Error loading Suitability Parameters. HTTP status ${ res.status }: ${ res.statusText }`));
      }).then(resolve).catch(reject);
    });
  }

  /**
   *
   * @param {MapView} view
   */
  initializeWindSuitabilityAnalysis(view) {
    return new Promise((resolve, reject) => {

      const suitabilityLayer = view.map.layers.find(l => l.title === 'Wind Suitability Analysis');
      suitabilityLayer.load().then(() => {

        // DEFAULT STATE //
        suitabilityLayer.renderingRule = {functionName: "None"};

        // ANALYSIS FUNCTION //
        const analysisFunctionName = 'Calc_Arith_8_ANF_clr';

        // DEFAULT ANALYSIS PARAMETERS //
        const defaultAnalysisParameters = {
          dist_faa: "$1",
          dist_fed: "$2",
          dist_grid: "$3",
          dist_sub: "$4",
          dist_trans: "$5",
          dist_pop: "$6",
          steepness: "$7",
          irr_zones: "$9"
        };

        this.updateSuitabilityAnalysis = () => {

          if (this.suitabilitySources?.length) {

            const {analysisParameters, names, totalWeight} = this.suitabilitySources.reduce((infos, suitabilitySource) => {

              if (!suitabilitySource.disabled) {
                const params = suitabilitySource.getAnalysisParameters();
                if (params) {
                  infos.analysisParameters = {...infos.analysisParameters, ...params};
                  infos.names.push(`${ suitabilitySource.name }_weighted`);
                  infos.totalWeight += suitabilitySource.weight;
                }
              }

              return infos;
            }, {analysisParameters: defaultAnalysisParameters, names: [], totalWeight: 0});

            // DO WE HAVE RASTERS TO ANALYZE? //
            if (names.length) {

              // SET OVERALL EXPRESSION //
              analysisParameters['Calc_Expression_2'] = `((${ names.join(' + ') })/${ totalWeight })`;

              //
              // SET ANALYSIS PARAMETERS //
              //
              suitabilityLayer.renderingRule = {
                functionName: analysisFunctionName,
                functionArguments: analysisParameters
              };

              console.info(analysisParameters);
            } else {
              suitabilityLayer.renderingRule = {functionName: "None"};
            }
          } else {
            suitabilityLayer.renderingRule = {functionName: "None"};
          }
        };

        resolve();
      }).catch(reject);
    });
  }

}

export default new Application();
