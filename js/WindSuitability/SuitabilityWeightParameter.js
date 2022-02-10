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
 * SuitabilityWeightParameter
 *  - Suitability Weight Parameter
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  12/30/2021 - 0.0.1 -
 * Modified:
 *
 */

class SuitabilityWeightParameter extends HTMLElement {

  static version = '0.0.1';

  /**
   *
   * @type {string|null}
   */
  label;

  /**
   *
   * @type {number}
   */
  min;

  /**
   *
   * @type {number}
   */
  max;

  /**
   *
   * @type {number}
   */
  weight;

  /**
   *
   * @type {number}
   */
  defaultWeight;

  /**
   * @type {CalciteSlider}
   */
  parameterSlider;

  /**
   * @type {boolean}
   */
  canDisable;

  /**
   * @type {boolean}
   */
  disabled;

  /**
   @type {string}
   */
  widthScale;

  /**
   *
   * @param {string} label
   * @param {number} min
   * @param {number} max
   * @param {number} weight
   * @param {string} widthScale
   * @param {boolean} canDisable
   * @param {boolean} disabled
   */
  constructor({label, min, max, weight, widthScale, canDisable = true, disabled = false}) {
    super();

    this.label = label || '';

    this.min = (min || 0);
    this.max = (max || 100);
    this.weight = this.defaultWeight = (weight || 5);

    this.canDisable = canDisable;
    this.disabled = disabled;
    this.widthScale = (widthScale || 'm');

    const shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = `      
      <style>
        /*/@import "https://js.arcgis.com/calcite-components/1.0.0-beta.69/calcite.css";*/
                      
        :host {                    
          display: flex;
          flex-direction: row;          
          justify-content: space-around;
          align-items: center; 
        }        
             
        .parameter-label:not(:empty){
          font-size: 9pt;
          text-align: right;
          margin: auto 8px 8px 8px; /* don't change! */
          width: 150px;
        }      
        
        .parameter-slider[width-scale="s"]{
          width: 80px;
        }  
        
        .parameter-slider[width-scale="m"]{
          width: 160px;
        }
        
        .parameter-slider[width-scale="l"]{
          width: 100%;
        }
                                      
        .parameter-slider {
          background: linear-gradient(to right, rgba(250, 54, 10, 0.1) 0%, rgba(243, 250, 30, 0.1) 50%,rgba(0, 110, 5, 0.1)  100%);
        }
        
        .parameter-slider:hover {
          background: linear-gradient(to right,  rgba(250, 54, 10, 0.5) 0%, rgba(243, 250, 30, 0.5) 50%,rgba(0, 110, 5, 0.5) 100%);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .parameter-slider:active {
          background: linear-gradient(to right, #FA360A 0%, #F3FA1E 50%, #006E05 100%);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        
        .parameter-slider[disabled] {          
          --calcite-ui-text-2: transparent;
          background: none;
          box-shadow: none;
        }
                                 
        .parameter-switch{
          margin: auto 5px 8px 5px;
        }
        
      </style>
      <div class="parameter-label">${ this.label }</div>
      <div>        
        <calcite-slider class="parameter-slider" ${ this.disabled ? 'disabled' : '' } min="${ this.canDisable ? 1 : 0 }" max="9" value="${ this.weight }" width-scale="${ this.widthScale }" ticks="${ this.widthScale === 's' ? '3' : '1' }" snap label-handles></calcite-slider>
      </div>         
      <calcite-switch class="parameter-switch" ${ this.disabled ? '' : 'checked' } ${ this.canDisable ? '' : 'hidden' }></calcite-switch>
    `;
  }

  /**
   *
   */
  connectedCallback() {

    const parameterSwitch = this.shadowRoot.querySelector('.parameter-switch');
    parameterSwitch.addEventListener('calciteSwitchChange', () => {
      this.disabled = this.parameterSlider.toggleAttribute('disabled', !parameterSwitch.checked);
      this.dispatchEvent(new CustomEvent('disabled-change', {}));
    });

    // WEIGHT SLIDER //
    this.parameterSlider = this.shadowRoot.querySelector('.parameter-slider');
    this.parameterSlider.addEventListener('calciteSliderInput', () => {
      this.weight = this.parameterSlider.value;
      this.dispatchEvent(new CustomEvent('weight-input', {}));
    });
    this.parameterSlider.addEventListener('calciteSliderChange', () => {
      this.dispatchEvent(new CustomEvent('weight-change', {}));
    });

  }

  /**
   *
   */
  reset() {
    this.parameterSlider.value = this.defaultWeight;
    this.dispatchEvent(new CustomEvent('weight-change', {}));
  }

}

customElements.define('suitability-weight-parameter', SuitabilityWeightParameter);

export default SuitabilityWeightParameter;
