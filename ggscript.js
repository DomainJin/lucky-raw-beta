function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    sheet.appendRow(['visionx', 'admin123', 0, 9999999999999]);
    data = sheet.getDataRange().getValues();
  }
  var accounts = [];
  for (var i = 1; i < data.length; i++) {
    accounts.push({
      username: data[i][0],
      password: data[i][1],
      active: Number(data[i][2]),
      revoke: Number(data[i][3])
    });
  }
  return ContentService.createTextOutput(JSON.stringify(accounts))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = e.parameter;
  Logger.log(params);
  // Xóa tài khoản
  if (params.action === 'delete' && params.username) {
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == params.username) {
        sheet.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({success: true}))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({error: "Không tìm thấy tài khoản"}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // Thêm tài khoản
  if (
    params.username && params.password &&
    params.active !== undefined && params.active !== '' && !isNaN(Number(params.active)) &&
    params.revoke !== undefined && params.revoke !== '' && !isNaN(Number(params.revoke))
  ) {
    var active = Number(params.active);
    var revoke = Number(params.revoke);
    if (isNaN(active) || isNaN(revoke)) {
      return ContentService.createTextOutput(JSON.stringify({error: "Thời gian không hợp lệ"}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    sheet.appendRow([params.username, params.password, active, revoke]);
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  // Thiếu thông tin
  return ContentService.createTextOutput(JSON.stringify({error: "Thiếu thông tin"}))
    .setMimeType(ContentService.MimeType.JSON);
}