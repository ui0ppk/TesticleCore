// Mercury Setup Deployer
// Place all client data inside staging, then run this script to deploy it
// with `deno task run` or `deno task headless`

// TODO: broken, rewrite in go

import {
	black,
	red,
	yellow,
	green,
	blue,
	gray,
	magenta,
	bold,
	italic,
	underline,
	bgGreen,
} from "https://deno.land/std@0.179.0/fmt/colors.ts"
import { writeAllSync } from "https://deno.land/std@0.179.0/streams/write_all.ts"
import { moveSync } from "https://deno.land/std@0.179.0/fs/mod.ts"
import { SEP } from "https://deno.land/std@0.179.0/path/separator.ts"
import AdmZip from "npm:adm-zip"

function error(txt: string) {
	console.error(red(txt))
	Deno.exit(1)
}
const log = (txt: string) =>
	writeAllSync(
		Deno.stdout,
		new TextEncoder().encode(txt + " ".repeat(Math.max(70 - txt.length, 1)))
	)
const done = () => console.log(bgGreen(bold(black(" Done! "))))

async function createDir(path: string) {
	try {
		await Deno.remove(path, { recursive: true })
	} catch {}
	await Deno.mkdir(path)
}

const cwd = Deno.cwd()
const RandomString = (size: number) =>
	Array(size)
		.map(() => Math.floor(Math.random() * 16).toString(16))
		.join("")
const GetFileName = (str: string) => str.substring(str.lastIndexOf("/"))

function zipFromArray(
	sources: string[],
	destination: string,
	baseDirectory = ""
) {
	const zip = new AdmZip()
	log(blue(`Creating ${underline(destination)}`))
	let entryName: string
	for (const file of sources) {
		if (baseDirectory.length > 0)
			entryName = file.replace(baseDirectory, "")
		else entryName = GetFileName(file)

		if (entryName == "ui")
			zip.addLocalFolder(`staging/${baseDirectory}${file}`, "ui")
		else zip.addLocalFile(`staging/${baseDirectory}${file}`)
	}
	zip.writeZip(destination)
	done()
}

function zipDirectory(source: string, destination: string) {
	const zip = new AdmZip()
	log(blue(`Creating ${underline(destination)}`))
	zip.addLocalFolder(source)
	zip.writeZip(destination)
	done()
}

const setup_directory = `${cwd + SEP}setup`
const versionHash = RandomString(16)

console.log(bold(italic(gray("\n  -- Mercury Setup Deployer --  \n"))))
let currentVersion

try {
	currentVersion = Deno.readTextFileSync(`${setup_directory}/version.txt`)
	if (!currentVersion) throw new Error("no version")
	console.log("Current version is", blue(currentVersion))
} catch {
	Deno.writeTextFileSync(`${setup_directory}/version.txt`, "none")
}

console.log(
	"New version to be deployed will have a version hash of",
	blue(`version-${versionHash}`)
)

console.log(green("Now commencing deployment\n"))

console.log("Checking staging directory")
try {
	Deno.mkdirSync("staging")
} catch {
	let files = false
	for (const _ of Deno.readDirSync("staging")) {
		files = true
		break
	}
	if (!files)
		error(
			"staging directory is empty - please place all the client files to be deployed inside there, then restart deployer"
		)
}

console.log(magenta(`Preparing ${underline("Mercury.zip")}`))
await createDir("PrepForUpload")
zipFromArray(
	[
		"MercuryPlayerBeta.exe",
		"MercuryStudioBeta.exe",
		"ReflectionMetadata.xml",
		"RobloxStudioRibbon.xml",
	],
	"PrepForUpload/Mercury.zip"
)
zipFromArray(
	Array.from(Deno.readDirSync("staging"))
		.filter(file => file.name.endsWith(".dll"))
		.map(file => file.name),
	"PrepForUpload/Libraries.zip"
)

log(blue(`Creating ${underline("redist.zip")}`))
const zip = new AdmZip()
zip.addLocalFolder("staging/Microsoft.VC90.CRT", "Microsoft.VC90.CRT")
zip.addLocalFolder("staging/Microsoft.VC90.MFC", "Microsoft.VC90.MFC")
zip.addLocalFolder("staging/Microsoft.VC90.OPENMP", "Microsoft.VC90.OPENMP")
zip.writeZip("PrepForUpload/redist.zip")
done()

function texturesHalf(half: 0 | 1) {
	let files = Array.from(Deno.readDirSync("staging/content/textures"))
		.filter(file => file.isFile)
		.map(file => file.name)
	files = files.slice(
		half * Math.floor(files.length / 2),
		(half + 1) * Math.floor(files.length / 2)
	)
	files.push("ui")
	return files
}

console.log(yellow(italic(`Now deploying version-${versionHash}`)))
const date = new Date()
Deno.writeTextFile(
	`${setup_directory}/DeployHistory.txt`,
	`New Client version-${versionHash} at ${
		date.getMonth() + 1
	}/${date.getDate()}/${date.getFullYear()} ${date.toLocaleTimeString()}... `,
	{ append: true }
)

console.log(magenta("Copying terrain plugins"))

for (const file of Deno.readDirSync("terrain plugins/processed"))
	if (file.isFile)
		Deno.copyFile(`terrain plugins/processed/${file.name}`, `staging/BuiltInPlugins/terrain/${file.name}`)

console.log(magenta(`Copying ${underline("MercuryPlayerLauncher.exe")}`))
Deno.copyFile("staging/MercuryPlayerLauncher.exe", "PrepForUpload/MercuryPlayerLauncher.exe")
Deno.copyFile("staging/MercuryPlayerLauncher.exe", `${setup_directory}/MercuryPlayerLauncher.exe`)

console.log(magenta(`Updating ${underline("version.txt")}`))
Deno.writeTextFile(`${setup_directory}/version.txt`, `version-${versionHash}`)

zipDirectory("staging/content/sky", "PrepForUpload/content-sky.zip")
zipDirectory("staging/content/fonts", "PrepForUpload/content-fonts.zip")
zipDirectory("staging/content/music", "PrepForUpload/content-music.zip")
zipDirectory("staging/content/sounds", "PrepForUpload/content-sounds.zip")
zipFromArray(texturesHalf(0), "PrepForUpload/content-textures.zip", "content/textures/")
zipFromArray(texturesHalf(1), "PrepForUpload/content-textures2.zip", "content/textures/")
zipDirectory("staging/PlatformContent/pc/textures/", "PrepForUpload/content-textures3.zip")
zipDirectory("staging/content/particles", "PrepForUpload/content-particles.zip")
zipDirectory("staging/BuiltInPlugins", "PrepForUpload/BuiltInPlugins.zip")
zipDirectory("staging/imageformats", "PrepForUpload/imageformats.zip")
zipDirectory("staging/shaders", "PrepForUpload/shaders.zip")

console.log(magenta(`Creating ${underline("MercuryVersion.txt")}`))
import { shCapture } from "https://deno.land/x/drake@v1.5.0/mod.ts"
const output = await shCapture(
	`(ls ${cwd}/staging/MercuryPlayerLauncher.exe | % versioninfo).FileVersion`
)
if (output?.code || 0 > 0)
	error(
		"Seems like attempting to get version info of MercuryPlayerLauncher.exe failed, are you using PowerShell on Windows?"
	)

Deno.writeTextFile("PrepForUpload/MercuryVersion.txt", output.output.trim())

console.log(
	magenta(
		`Copying contents of ${underline("PrepForUpload")} to ${underline(
			setup_directory + SEP + "version-" + versionHash
		)}`
	)
)
moveSync("PrepForUpload", `${setup_directory}/version-${versionHash}`)

Deno.writeTextFile(`${setup_directory}/DeployHistory.txt`, "Done!\n", {
	append: true,
})

console.log(" ~~~~  Deployment complete!!  ~~~~ ")
