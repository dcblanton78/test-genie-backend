import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();

app.use(express.json());

// Enable cross-origin resource sharing
app.use(cors());

import db from "./db.js"; // Import db from database.js

app.use(express.json());

// rest of your code...

// Define a route that saves test cases to the MySQL database
app.post("/store-test-cases", async (req, res) => {
  try {
    console.log("req.body:", req.body);

    let testCases = req.body;
    // Check if testCases is an array. If not, convert it into an array.
    if (!Array.isArray(testCases)) {
      testCases = [testCases];
    }

    for (let testCase of testCases) {
      const {
        ID,
        Description,
        Expected_Result,
        Actual_Result = null,
        Status,
      } = testCase;
      console.log("Status: ", Status);

      await db.execute(
        "INSERT INTO test_cases (test_case_id, Description, Expected_Result, Actual_Result, Status) VALUES (?, ?, ?, ?, ?)",
        [ID, Description, Expected_Result, Actual_Result, Status]
      );
    }

    res.status(201).json({ message: "Test cases saved successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred." });
  }
});

// Define a route that returns a simple string response
app.get("/hello", (req, res) => {
  res.json("Hello World");
});

// Define a route that generates test cases based on user-provided requirements
app.get("/get-test-cases", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM test_cases");
    res.status(200).json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred." });
  }
});

app.get("/generate-test-cases", async (req, res) => {
  const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

  // Get the requirements parameter from the query string
  const requirements = req.query.requirements;

  const MOCK_TEST_CASES = [
    {
      ID: "TC1",
      Description: "Test Case 1 Description",
      Expected_Result: "Expected Result for Test Case 1",
      Actual_Result: "",
      Status: null,
    },
    // additional test cases...
  ];

  if (process.env.MOCK_TEST_DATA === "true") {
    return res.status(200).json(MOCK_TEST_CASES);
  }

  // Log the requirements to the console (for debugging purposes)
  console.log(requirements);

  // Create the data object to send to OpenAI's API
  const data = {
    model: "text-davinci-003",
    prompt:
      "Please provide all possible test cases associated with the following requirement in Gherkin syntax (Given, When, Then). In addition to happy path, include all negative cases, edge cases, and corner cases. Please include all the following information: Test Case ID, Description, and Expected Result. Provide the answer as a JSON object with a key 'testCases' that has a value of an array containing objects with keys for 'ID', 'Description', and 'Expected_Result'. ONLY include the Given, When steps in the Description and ONLY the Then step should be included in the Expected Result. Be sure to start with the word Then in the Expected Result. For example, Description: Given I am on the reset password page, Expected Result: When I enter my email address. Then I am sent a link to reset my password: " +
      requirements,
    max_tokens: 1500,
    temperature: 0.4,
  };

  // Set up the configuration object for the API request
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  try {
    // Send a POST request to OpenAI's API to generate the test cases
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      data,
      config
    );

    // Extract the generated test cases from the API response
    const generatedTestCases = response.data.choices[0].text;
    const parsedTestCases = JSON.parse(generatedTestCases).testCases;

    // Send the parsed test cases as a JSON response to the client
    res.json(parsedTestCases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Define a route that generates unit tests based on user-provided requirements
app.get("/generate-unit-tests", async (req, res) => {
  const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

  // Get the requirements parameter from the query string
  const requirements = req.query.requirements;

  const MOCK_UNIT_TESTS = `


    describe('View Listing Details', () => {
      const mockListing = {
        id: 1,
        photos: ['photo1.jpg', 'photo2.jpg'],
        description: 'This is a great listing',
        houseRules: 'No parties',
        reviews: [{ author: 'John', rating: 5 }, { author: 'Jane', rating: 4 }],
        pricing: {
          basePrice: 100,
          extraPersonFee: 10
        }
      };

      test('should return the correct listing photos', () => {
        expect(mockListing.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
      });

      // Rest of tests
    });
    `;

  if (process.env.MOCK_TEST_DATA === "true") {
    return res.status(200).json(MOCK_UNIT_TESTS);
  }

  // Create the data object to send to OpenAI's API
  const data = {
    model: "text-davinci-003",
    prompt:
      "Please provide the jest unit tests to test the following requirement: " +
      requirements +
      ". The response should be formatted like this example: \n\n" +
      "describe('View Listing Details', () => {\n" +
      "  const mockListing = {\n" +
      "    id: 1,\n" +
      "    photos: ['photo1.jpg', 'photo2.jpg'],\n" +
      "    description: 'This is a great listing',\n" +
      "    houseRules: 'No parties',\n" +
      "    reviews: [{ author: 'John', rating: 5 }, { author: 'Jane', rating: 4 }],\n" +
      "    pricing: {\n" +
      "      basePrice: 100,\n" +
      "      extraPersonFee: 10\n" +
      "    }\n" +
      "  };\n\n" +
      "  test('should return the correct listing photos', () => {\n" +
      "    expect(mockListing.photos).toEqual(['photo1.jpg', 'photo2.jpg']);\n" +
      "  });\n\n" +
      // Rest of tests
      "});",

    max_tokens: 1500,
    temperature: 0.4,
  };

  // Set up the configuration object for the API request
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  try {
    // Send a POST request to OpenAI's API to generate the unit tests
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      data,
      config
    );

    // Extract the generated unit tests from the API response
    const generatedUnitTests = response.data.choices[0].text;

    // Send the generated unit tests as a JSON response to the client
    res.json(generatedUnitTests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/generate-integration-tests", async (req, res) => {
  const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

  // Get the requirements parameter from the query string
  const requirements = req.query.requirements;

  const MOCK_INTEGRATION_TESTS = `
    describe('TEST!!! View Listing Details', () => {
      const mockListing = {
        id: 1,
        photos: ['photo1.jpg', 'photo2.jpg'],
        description: 'This is a great listing',
        houseRules: 'No parties',
        reviews: [{ author: 'John', rating: 5 }, { author: 'Jane', rating: 4 }],
        pricing: {
          basePrice: 100,
          extraPersonFee: 10
        }
      };

      test('should return the correct listing photos', () => {
        expect(mockListing.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
      });

      // Rest of tests
    });
    `;

  if (process.env.MOCK_TEST_DATA === "true") {
    return res.status(200).json(MOCK_INTEGRATION_TESTS);
  }

  // Create the data object to send to OpenAI's API
  const integrationData = {
    model: "text-davinci-003",
    prompt:
      "Please provide the jest integration (not unit!) tests to test the following requirement: " +
      requirements,
    max_tokens: 1500,
    temperature: 0.4,
  };
  console.log(integrationData);

  // Set up the configuration object for the API request
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  try {
    // Send a POST request to OpenAI's API to generate the integration tests
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      integrationData,
      config
    );

    // Extract the generated integration tests from the API response
    const generatedIntegrationTests = response.data.choices[0].text;

    // Send the generated integration tests as a JSON response to the client
    res.json(generatedIntegrationTests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create route to handle requests to the /generate-e2e-tests endpoint
app.get("/generate-e2e-tests", async (req, res) => {
  const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
  const requirements = req.query.requirements;

  const MOCK_E2E_TESTS = `


    describe('TEST!!! View Listing Details', () => {
      const mockListing = {
        id: 1,
        photos: ['photo1.jpg', 'photo2.jpg'],
        description: 'This is a great listing',
        houseRules: 'No parties',
        reviews: [{ author: 'John', rating: 5 }, { author: 'Jane', rating: 4 }],
        pricing: {
          basePrice: 100,
          extraPersonFee: 10
        }
      };

      test('should return the correct listing photos', () => {
        expect(mockListing.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
      });

      // Rest of tests
    });
    `;

  if (process.env.MOCK_TEST_DATA === "true") {
    return res.status(200).json(MOCK_E2E_TESTS);
  }

  // Create the data object to send to OpenAI's API
  const e2eData = {
    model: "text-davinci-003",
    prompt: `Please provide the Cypress End to End tests to test the following requirement: ${requirements}. Here is an example of what the response should look like: 

    describe('Listing Search', () => {
      beforeEach(() => {
        // Visit the homepage
        cy.visit('http://www.airbnb.com');
      });

      it('should allow a guest to search by location', () => {
        cy.get('[data-cy=location-input]').type('New York');
        cy.get('[data-cy=search-submit]').click();
        cy.get('[data-cy=listing]').should('be.visible');
      });

      it('should allow a guest to search by dates', () => {
        cy.get('[data-cy=checkin-date-input]').type('2023-07-01');
        cy.get('[data-cy=checkout-date-input]').type('2023-07-10');
        cy.get('[data-cy=search-submit]').click();
        cy.get('[data-cy=listing]').should('be.visible');
      });

      it('should allow a guest to search by number of guests', () => {
        cy.get('[data-cy=guests-input]').type('4');
        cy.get('[data-cy=search-submit]').click();
        cy.get('[data-cy=listing]').should('be.visible');
      });

      it('should allow a guest to search by amenities', () => {
        cy.get('[data-cy=amenities-dropdown]').click();
        cy.get('[data-cy=amenities-wifi-checkbox]').check();
        cy.get('[data-cy=search-submit]').click();
        cy.get('[data-cy=listing]').should('be.visible');
      });

      it('should allow a guest to search by location, dates, number of guests, and amenities', () => {
        cy.get('[data-cy=location-input]').type('New York');
        cy.get('[data-cy=checkin-date-input]').type('2023-07-01');
        cy.get('[data-cy=checkout-date-input]').type('2023-07-10');
        cy.get('[data-cy=guests-input]').type('4');
        cy.get('[data-cy=amenities-dropdown]').click();
        cy.get('[data-cy=amenities-wifi-checkbox]').check();
        cy.get('[data-cy=search-submit]').click();
        cy.get('[data-cy=listing]').should('be.visible');
      });
    });`,
    max_tokens: 1500,
    temperature: 0.4,
  };

  //console.log(e2eData);
  // Set up the configuration object for the API request
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  try {
    // Send a POST request to OpenAI's API to generate the integration tests
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      e2eData,
      config
    );

    // Extract the generated End to End tests from the API response
    const generatedE2ETests = response.data.choices[0].text;

    // Send the generated integration tests as a JSON response to the client
    res.json(generatedE2ETests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/generate-test-cases-from-code", async (req, res) => {
  const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

  console.log("From CODE req.query.code: " + req.query.code);

  // Get the parameter from the query string
  const codeBlock = req.query.code;

  const MOCK_TEST_CASES = [
    {
      ID: "TC1",
      Description: "Test Case 1 Description",
      Expected_Result: "Expected Result for Test Case 1",
      Actual_Result: "",
      Status: null,
    },
    // additional test cases...
  ];

  if (process.env.MOCK_TEST_DATA === "true") {
    return res.status(200).json(MOCK_TEST_CASES);
  }

  // Log the codeBlock to the console (for debugging purposes)
  //console.log(codeBlock);

  // Create the data object to send to OpenAI's API
  const data = {
    model: "text-davinci-003",
    prompt:
      'Please provide all possible test cases associated with the following code in Gherkin syntax (Given, When, Then). In addition to happy path, include all negative cases, edge cases, and corner cases. Please include all the following information: Test Case ID, Description, and Expected Result. Provide the answer as a JSON object with a key "testCases" that has a value of an array containing objects with keys for "ID", "Description", and "Expected_Result". ONLY include the Given, When steps in the Description and ONLY the Then step should be included in the Expected Result. Be sure to start with the word Then in the Expected Result. For example, Description: Given I am on the reset password page, Expected Result: When I enter my email address. Then I am sent a link to reset my password. Here is an example of a good json response {' +
      '  "testCases": [' +
      "    {" +
      '      "ID": 1,' +
      '      "Description": "Given a new instance of handleActualResultChange function",' +
      '      "Expected_Result": "Then the local testCases variable is updated with the user-supplied value"' +
      "    }," +
      "    {" +
      '      "ID": 2,' +
      '      "Description": "Given an index that is out of the range of possible values for the testCases array",' +
      '      "Expected_Result": "Then the local testCases variable is not updated"' +
      "    }" +
      "  ]" +
      "}" +
      codeBlock,

    max_tokens: 1500,
    temperature: 0.4,
  };

  // Set up the configuration object for the API request
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  try {
    // Send a POST request to OpenAI's API to generate the test cases
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      data,
      config
    );

    // Extract the generated test cases from the API response
    const generatedTestCases = response.data.choices[0].text;
    console.log("generatedTestCases: " + generatedTestCases);
    const parsedTestCases = JSON.parse(generatedTestCases).testCases;

    // Send the parsed test cases as a JSON response to the client
    res.json(parsedTestCases);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Define a route that generates unit tests based on user-provided codeBlock
app.get("/generate-unit-tests-from-code", async (req, res) => {
  const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

  // Get the codeBlock parameter from the query string
  const codeBlock = req.query.code;

  const MOCK_UNIT_TESTS = `


    describe('View Listing Details', () => {
      const mockListing = {
        id: 1,
        photos: ['photo1.jpg', 'photo2.jpg'],
        description: 'This is a great listing',
        houseRules: 'No parties',
        reviews: [{ author: 'John', rating: 5 }, { author: 'Jane', rating: 4 }],
        pricing: {
          basePrice: 100,
          extraPersonFee: 10
        }
      };

      test('should return the correct listing photos', () => {
        expect(mockListing.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
      });

      // Rest of tests
    });
    `;

  if (process.env.MOCK_TEST_DATA === "true") {
    return res.status(200).json(MOCK_UNIT_TESTS);
  }

  // Create the data object to send to OpenAI's API
  const data = {
    model: "text-davinci-003",
    prompt:
      "Please provide the jest unit tests to test the following code: " +
      codeBlock +
      ". The response should be formatted like this example: \n\n" +
      "describe('View Listing Details', () => {\n" +
      "  const mockListing = {\n" +
      "    id: 1,\n" +
      "    photos: ['photo1.jpg', 'photo2.jpg'],\n" +
      "    description: 'This is a great listing',\n" +
      "    houseRules: 'No parties',\n" +
      "    reviews: [{ author: 'John', rating: 5 }, { author: 'Jane', rating: 4 }],\n" +
      "    pricing: {\n" +
      "      basePrice: 100,\n" +
      "      extraPersonFee: 10\n" +
      "    }\n" +
      "  };\n\n" +
      "  test('should return the correct listing photos', () => {\n" +
      "    expect(mockListing.photos).toEqual(['photo1.jpg', 'photo2.jpg']);\n" +
      "  });\n\n" +
      // Rest of tests
      "});",

    max_tokens: 1500,
    temperature: 0.4,
  };

  // Set up the configuration object for the API request
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  try {
    // Send a POST request to OpenAI's API to generate the unit tests
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      data,
      config
    );

    // Extract the generated unit tests from the API response
    const generatedUnitTests = response.data.choices[0].text;

    // Send the generated unit tests as a JSON response to the client
    res.json(generatedUnitTests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/generate-integration-tests-from-code", async (req, res) => {
  const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

  // Get the codeBlock parameter from the query string
  const codeBlock = req.query.code;

  const MOCK_INTEGRATION_TESTS = `
    describe('TEST!!! View Listing Details', () => {
      const mockListing = {
        id: 1,
        photos: ['photo1.jpg', 'photo2.jpg'],
        description: 'This is a great listing',
        houseRules: 'No parties',
        reviews: [{ author: 'John', rating: 5 }, { author: 'Jane', rating: 4 }],
        pricing: {
          basePrice: 100,
          extraPersonFee: 10
        }
      };

      test('should return the correct listing photos', () => {
        expect(mockListing.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
      });

      // Rest of tests
    });
    `;

  if (process.env.MOCK_TEST_DATA === "true") {
    return res.status(200).json(MOCK_INTEGRATION_TESTS);
  }

  // Create the data object to send to OpenAI's API
  const integrationData = {
    model: "text-davinci-003",
    prompt:
      "Please provide the jest integration (not unit!) tests to test the following code: " +
      codeBlock,
    max_tokens: 1500,
    temperature: 0.4,
  };
  console.log(integrationData);

  // Set up the configuration object for the API request
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  try {
    // Send a POST request to OpenAI's API to generate the integration tests
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      integrationData,
      config
    );

    // Extract the generated integration tests from the API response
    const generatedIntegrationTests = response.data.choices[0].text;

    // Send the generated integration tests as a JSON response to the client
    res.json(generatedIntegrationTests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create route to handle requests to the /generate-e2e-tests endpoint
app.get("/generate-e2e-tests-from-code", async (req, res) => {
  const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
  const codeBlock = req.query.code;

  const MOCK_E2E_TESTS = `


    describe('TEST!!! View Listing Details', () => {
      const mockListing = {
        id: 1,
        photos: ['photo1.jpg', 'photo2.jpg'],
        description: 'This is a great listing',
        houseRules: 'No parties',
        reviews: [{ author: 'John', rating: 5 }, { author: 'Jane', rating: 4 }],
        pricing: {
          basePrice: 100,
          extraPersonFee: 10
        }
      };

      test('should return the correct listing photos', () => {
        expect(mockListing.photos).toEqual(['photo1.jpg', 'photo2.jpg']);
      });

      // Rest of tests
    });
    `;

  if (process.env.MOCK_TEST_DATA === "true") {
    return res.status(200).json(MOCK_E2E_TESTS);
  }

  // Create the data object to send to OpenAI's API
  const e2eData = {
    model: "text-davinci-003",
    prompt: `Please provide the Cypress End to End tests to test the following code: ${codeBlock}. Here is an example of what the response should look like: 

    describe('Listing Search', () => {
      beforeEach(() => {
        // Visit the homepage
        cy.visit('http://www.airbnb.com');
      });

      it('should allow a guest to search by location', () => {
        cy.get('[data-cy=location-input]').type('New York');
        cy.get('[data-cy=search-submit]').click();
        cy.get('[data-cy=listing]').should('be.visible');
      });

      it('should allow a guest to search by dates', () => {
        cy.get('[data-cy=checkin-date-input]').type('2023-07-01');
        cy.get('[data-cy=checkout-date-input]').type('2023-07-10');
        cy.get('[data-cy=search-submit]').click();
        cy.get('[data-cy=listing]').should('be.visible');
      });

      it('should allow a guest to search by number of guests', () => {
        cy.get('[data-cy=guests-input]').type('4');
        cy.get('[data-cy=search-submit]').click();
        cy.get('[data-cy=listing]').should('be.visible');
      });

      it('should allow a guest to search by amenities', () => {
        cy.get('[data-cy=amenities-dropdown]').click();
        cy.get('[data-cy=amenities-wifi-checkbox]').check();
        cy.get('[data-cy=search-submit]').click();
        cy.get('[data-cy=listing]').should('be.visible');
      });

      it('should allow a guest to search by location, dates, number of guests, and amenities', () => {
        cy.get('[data-cy=location-input]').type('New York');
        cy.get('[data-cy=checkin-date-input]').type('2023-07-01');
        cy.get('[data-cy=checkout-date-input]').type('2023-07-10');
        cy.get('[data-cy=guests-input]').type('4');
        cy.get('[data-cy=amenities-dropdown]').click();
        cy.get('[data-cy=amenities-wifi-checkbox]').check();
        cy.get('[data-cy=search-submit]').click();
        cy.get('[data-cy=listing]').should('be.visible');
      });
    });`,
    max_tokens: 1500,
    temperature: 0.4,
  };

  //console.log(e2eData);
  // Set up the configuration object for the API request
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  };

  try {
    // Send a POST request to OpenAI's API to generate the integration tests
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      e2eData,
      config
    );

    // Extract the generated End to End tests from the API response
    const generatedE2ETests = response.data.choices[0].text;

    // Send the generated integration tests as a JSON response to the client
    res.json(generatedE2ETests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// Start the server and listen for incoming requests
