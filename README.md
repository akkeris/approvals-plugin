# approvals-plugin

An approvals plugin using pipeline status checks. This approvals plugin lets you add approvals to a release via

```
aka releases:approve -a app-space -d 'Fantastic release' v321
```

Or, you can reject a release and prevent it from being promoted.

```
aka release:reject -a app-space -d 'No, we're not doing this.' v321
```

If you do not specify a release version (`v321`) the latest release in the app is assumed.

## Installing

1. Install the plugin using `aka plugins:install approvals`. 
2. Perform a dummy approval on any app in the pipeline, the user to perform this must be the user who will be approving releases going forward. `aka releases:approve myapp-devspace`.
3. In the UI: Go to the pipeline you'd like to add the status check for, edit the app in the pipeline, then in the status checks section find the `approvals/your.name` and click the checkbox, then click save.
4. Or, in the CLI: get the apps pipeline coupling id by running `aka pipelines:info PIPELINE_NAME` and run `aka pipelines:update PIPELINE_COUPLING_ID -c 'approvals/your.name'`.
