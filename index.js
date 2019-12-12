
const util = require('util');
const assert = require('assert');

async function find_release(appkit, app, release_key) {
  let get = util.promisify(appkit.api.get)
  if(/^[\w]{8}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{12}$/.exec(release_key) !== null) {
    // uuuid
    return await get(`/apps/${app}/releases/${release_key}`)
  } else if (/^v[0-9]+$/.exec(release_key) !== null || !Number.isNaN(parseInt(release_key, 10))) {
    // vNNN format
    let version = parseInt(release_key, 10)
    if(Number.isNaN(version)) {
      version = parseInt(release_key.substring(1), 10)
    }
    assert.ok(!Number.isNaN(version), 'The version, was not... a version.')
    let results = await get(`/apps/${app}/releases`)
    results = results.filter((x) => x.version === version)
    assert.ok(results.length === 1, `The version ${version} was not found.`)
    return results[0]
  } else if (release_key === 'previous') {
    // not current, but one before
    let results = await get(`/apps/${app}/releases`)
    assert.ok(results.length > 1, 'A previous release was not found.')
    return results[results.length - 2]
  } else {
    // current release
    let results = await get(`/apps/${app}/releases`)
    assert.ok(results.length > 0, 'No releases were found.')
    return results[results.length - 1]
  }
}

async function approve(appkit, args) {
  assert.ok(args.app && args.app !== '', 'An application name was not provided.');
  if(args.RELEASE === '' || !args.RELEASE) {
    args.RELEASE = 'latest';
  }
  let loader = appkit.terminal.task('Submitting approval');
  loader.start();
  let release = await find_release(appkit, args.app, args.RELEASE);
  let whoami = await appkit.api.get('/account');
  let name = whoami.name.replace(/ /g, '.').replace(/'/g, '').toLowerCase();
  try {
    await appkit.api.post(JSON.stringify({"state":"success", "context":"approvals/" + name, "name":`Approval from ${whoami.name}`, "description":args.description}), `/apps/${args.app}/releases/${release.id}/statuses`)
    loader.end('ok');
  } catch (err) {
    if(err.code === 422) {
      try {  
        let statuses = await appkit.api.get(`/apps/${args.app}/releases/${release.id}/statuses`);
        let status = statuses.statuses.filter((x) => x.context === "approvals/" + name)[0];
        assert.ok(status, 'The status could not be found for an existing release.');
        await appkit.api.patch(JSON.stringify({"state":"success", "description":args.description}), `/apps/${args.app}/releases/${release.id}/statuses/${status.id}`)
        loader.end('ok');
      } catch (e) {
        loader.end('error');
        return appkit.terminal.error(e);
      }
    } else {
      loader.end('error');
      return appkit.terminal.error(err);
    }
  }
}

async function disapprove(appkit, args) {
  assert.ok(args.app && args.app !== '', 'An application name was not provided.');
  if(args.RELEASE === '' || !args.RELEASE) {
    args.RELEASE = 'latest';
  }
  let loader = appkit.terminal.task('Submitting reject');
  loader.start();
  let release = await find_release(appkit, args.app, args.RELEASE);
  let whoami = await appkit.api.get('/account');
  let name = whoami.name.replace(/ /g, '.').replace(/'/g, '').toLowerCase();
  try {
    await appkit.api.post(JSON.stringify({"state":"failure", "context":"approvals/" + name, "name":`Approval from ${whoami.name}`, "description":args.description}), `/apps/${args.app}/releases/${release.id}/statuses`)
    loader.end('ok');
  } catch (err) {
    if(err.code === 422) {
      try {  
        let statuses = await appkit.api.get(`/apps/${args.app}/releases/${release.id}/statuses`);
        let status = statuses.statuses.filter((x) => x.context === "approvals/" + name)[0];
        assert.ok(status, 'The status could not be found for an existing release.');
        await appkit.api.patch(JSON.stringify({"state":"failure", "description":args.description}), `/apps/${args.app}/releases/${release.id}/statuses/${status.id}`)
        loader.end('ok');
      } catch (e) {
        loader.end('error');
        return appkit.terminal.error(e);
      }
    } else {
      loader.end('error');
      return appkit.terminal.error(err);
    }
  }
}

module.exports = {
  init:function(appkit) {
    let options = {
      'app':{
        'alias':'a',
        'demand':true,
        'string':true,
        'description':'The app with the release to approve/reject.'
      },
      'description':{
        'alias':'d',
        'demand':false,
        'default':'',
        'string':true,
        'description':'A description as to why the release was approved/rejected.'
      },
    };
    appkit.args
      .command('releases:approve [RELEASE]', 'Approve a release (as a release status check)', options, approve.bind(null, appkit))
      .command('releases:reject [RELEASE]', 'Reject an approval on a release (as a release status check)', options, disapprove.bind(null, appkit))
  },
  update:function(){},
  group:'releases',
  help:'Manage releases (create, list, rollback)',
  primary:false
};