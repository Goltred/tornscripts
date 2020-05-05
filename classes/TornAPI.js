class TornAPI {
  static USERDATAKEY = 'TornAPI_userData';

  constructor(key, storage) {
    this.baseUrl = 'https://api.torn.com'
    this.key = key;
    this.userData = {};
  }

  async setupUserData() {
    let data = await this.user();
    if (data) {
      this.userData.name = data.name;
      this.userData.player_id = data.player_id;
    }
  }

  async faction(selections = '') {
    const targetUrl = `${this.baseUrl}/faction/?selections=${selections}&key=${this.key}`;
    return new Promise((resolve, reject) => {
      $.get(targetUrl, (data) => {
        if (data.error) reject(`TornAPI: Error Code: ${data.code} - ${data.error}`);
        resolve(data);
      });
    });
  }

  async user(selections = '') {
    const targetUrl = `${this.baseUrl}/user/?selections=${selections ? selections : ''}&key=${this.key}`;
    return new Promise((resolve, reject) => {
      $.get(targetUrl, (data) => {
        if (data.error) reject(`TornAPI: ${data.code} - ${data.error}`);
        resolve(data);
      });
    });
  }

  async torn(selections = '') {
    return new Promise((resolve, reject) => {
      const targetUrl = `${this.baseUrl}/torn/?selections=${selections ? selections : ''}&key=${this.key}`;
      $.get(targetUrl, (data) => {
        if (data.error) reject(`TornAPI: ${data.code} - ${data.error}`);
        resolve(data);
      });
    });
  }

  async market(id, selections = '') {
    const targetUrl = `${this.baseUrl}/market/${id ? id : ''}?selections=${selections ? selections : ''}&key=${this.key}`;
    return new Promise((resolve, reject) => {
      $.get(targetUrl, (data) => {
        if (data.error) reject(`TornAPI: ${data.code} - ${data.error}`);
        resolve(data);
      });
    });
  }

  static showAPIInput(cb) {
    const body = $('body');

    const inputBox = $(`
      <div class="info-msg" id="tcapi-apibox" style="position: absolute;top: 0;right: 0;background-color: lightgray; border-style: solid; border-left: 5px solid red; z-index: 100000">
        <p>Enter your API Key</p>
        <input type="text" id="tcapi-input-api" />
        <button id="tcapi-save-api">Save</button>
      </div>`);
    body.append(inputBox);
    $('#tcapi-save-api').on('click', () => TornAPI.saveAPI(cb));
  }

  static saveAPI(cb) {
    const val = $('#tcapi-input-api').val();
    GM_setValue('apikey', val);
    $("#tcapi-apibox").css('display', 'none');
    if (cb) {
      cb(val);
    }
  }
}
