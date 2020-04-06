const admin = require('firebase-admin')
const functions = require('firebase-functions')
const axios = require('axios')
const helpers = require('./helpers')

const CREATE_SIGN_UP_FUNCTION_NAME = 'createSignUp'
const CREATE_VOLUNTEER_FUNCTION_NAME = 'createVolunteer'
// API_URL is expected to have a trailing forward slash
const { API_URL } = process.env

exports.volunteerSignUp = functions.https.onRequest(
  async (request, response) => {
    const formItemTitleToKeyMap = {
      Availability: 'availability',
      'Contact Number': 'contact_number',
      'Data privacy consent': 'data_privacy_consent',
      Discord: 'discord',
      'Do you have a car?': 'owns_car',
      Email: 'email',
      Facebook: 'facebook',
      'I am a...': 'roles',
      'I speak English and...': 'spoken_languages',
      Postcode: 'postcode',
      'Services offered': 'services_offered',
      Telegram: 'telegram',
      Whatsapp: 'whatsapp',
      'Your name': 'name'
    }

    function changeObjectKeys(obj, map) {
      let result = {}
      const mapKeys = Object.keys(map)
      mapKeys.forEach(mapKey => {
        let value = obj[mapKey]
        let newKey = map[mapKey]
        result[newKey] = value
      })
      return result
    }

    function certainStringValuesToArray(targetKeys, object) {
      /* transforms certain values of the object from string to array, using comma as the separator, based on the keys provided*/
      const keys = Object.keys(object)
      keys.forEach(key => {
        if (targetKeys.includes(key)) {
          object[key] = object[key].split(',')
        }
      })
      return object
    }

    const boolQuestionMap = {
      owns_car: {
        Yes: true,
        No: false
      }
    }

    function parseBoolQuestionValues(obj, map) {
      const questionKeys = Object.keys(map)

      questionKeys.forEach(questionKey => {
        // assumes that the value is an array
        const answerArray = obj[questionKey]
        const firstValue = answerArray[0]
        const mapObject = map[questionKey]
        const resultingValue = mapObject[firstValue]
        obj[questionKey] = resultingValue
      })
      return obj
    }

    try {
      const { body } = request
      let signUpData = body

      // below is a hack because we had to call Array.string() from the Script Editor side to solve the java.lang issue
      const keysMeantToBeArrays = [
        'Availability',
        'I am a...',
        'Data Privacy Consent',
        'Do you have a car?'
      ]
      // todo: move below to new parseData function
      signUpData = certainStringValuesToArray(keysMeantToBeArrays, signUpData)
      signUpData = changeObjectKeys(signUpData, formItemTitleToKeyMap)
      signUpData = parseBoolQuestionValues(signUpData, boolQuestionMap)

      const createRecordUrl =
        API_URL + CREATE_SIGN_UP_FUNCTION_NAME
      const postResult = await axios.post(createRecordUrl, signUpData).data
      response.send(postResult)
    } catch (e) {
      console.error(e)
      response.send(JSON.stringify(e))
    }
  }
)

admin.initializeApp()
const db = admin.firestore()

exports.createSignUp = functions.https.onRequest(async (request, response) => {
  try {
    const { body } = request
    const collectionName = 'sign-ups'
    const result = await db
      .collection(collectionName)
      .doc()
      .set(body)
    const createVolunteerPayload = helpers.parseSignUpToVolunteer(body, result.id)
    const createVolunteerUrl = API_URL + CREATE_VOLUNTEER_FUNCTION_NAME
    const postResult = await axios.post(createVolunteerUrl, createVolunteerPayload).data
    response.send(postResult)
  } catch (e) {
    console.error(e)
    response.send(JSON.stringify(e))
  }
})

exports.createVolunteer = functions.https.onRequest(async (request, response) => {
  try {
    const { body } = request
    // TODO: validate body matches schema
    const collectionName = 'volunteers'
    const result = await db
      .collection(collectionName)
      .doc()
      .set(body)

    response.send(result)
  } catch (e) {
    console.error(e)
    response.send(JSON.stringify(e))
  }
})
