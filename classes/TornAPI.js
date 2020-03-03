class TornAPI {
  constructor(key) {
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
        if (data.error) reject(`Torn Faction Bank Script: Error Code: ${data.code} - ${data.error}`);
        resolve(data);
      });
    });
  }

  async user(selections = '') {
    const targetUrl = `${this.baseUrl}/user/?selections=${selections ? selections : ''}&key=${this.key}`;
    return new Promise((resolve) => {
      $.get(targetUrl, (data) => {
        if (data.error) reject(`Torn Faction Bank Script: ${data.code} - ${data.error}`);
        resolve(data);
      });
    });
  }
}