import {defineConfig,devices} from "@playwright/test";
export default defineConfig({
  testDir:"./tests/e2e",
  timeout:30000,
  expect:{timeout:10000},
  fullyParallel:false,
  retries:process.env.CI?1:0,
  use:{baseURL:"http://127.0.0.1:4173",trace:"retain-on-failure",screenshot:"only-on-failure"},
  projects:[
    {name:"mobile-chromium",use:{...devices["Desktop Chrome"],viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
    {name:"desktop-chromium",use:{...devices["Desktop Chrome"],viewport:{width:1280,height:800}}}
  ],
  webServer:{
    command:"npm run dev",
    url:"http://127.0.0.1:4173",
    timeout:30000,
    reuseExistingServer:!process.env.CI,
    env:{MOCK_API:"1"}
  }
});
