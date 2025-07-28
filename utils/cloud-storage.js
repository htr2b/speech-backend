import { Storage } from "@google-cloud/storage"


const storage = new Storage({
    projectId: "speechtotex-466107",
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
})

const BUCKET_NAME = 'speechtotexting'

const uploadToCloudStorage = async (filepath, fileName) => {
    try {
        const gcs = storage.bucket(BUCKET_NAME) // Removed "gs://" from the bucket name
        const storagepath = `storage_folder/${fileName}`

        const result = await gcs.upload(filepath, {
            destination: storagepath,
            metadata: {
                contentType: "audio/mpeg", // Adjust the content type as needed
            }
        })

        return `gs://${BUCKET_NAME}/${storagepath}`

    } catch (error) {
        console.log(error)
        throw new Error(error.message)
    }
}

export default uploadToCloudStorage