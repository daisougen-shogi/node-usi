import USI from "./src/index"

async function main() {
    console.log("connecting")

    const apery = USI.execFile("C:\\Users\\defli\\Downloads\\syogi\\apery_sdt5\\bin\\apery_sdt5_bmi2.exe", [], {windowsHide: false});
    
    await apery.init();

    await apery.ready();

    apery.kill();
    
    console.log("connected")    
}

main().catch(
    e => console.error(e)
)