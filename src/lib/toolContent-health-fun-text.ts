// FAQ + how-to content for Health & Lifestyle, Fun & Games, and the
// remaining Text & Writing tools (Omnitily SEO P1).
//
// Every claim here was checked against the tool's component in
// src/components/ (or GenericUtilityWorkspace.tsx) and
// ~/workspace/omnitily-seo/TOOL_CHECK.md. Health results are estimates,
// not medical advice; love-calculator scores are entertainment only.

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ToolContent {
  id: string;
  howToTitle: string;
  howToIntro: string;
  howToSteps: string[];
  faqs: ToolFaq[];
  features: string[];
}

export const TOOL_CONTENT_HEALTH_FUN_TEXT: Record<string, ToolContent> = {
  'bmi-calc': {
    id: 'bmi-calc',
    howToTitle: 'How to calculate your BMI',
    howToIntro:
      'The BMI calculator turns your height and weight into a Body Mass Index score and a weight category, so you can see where you stand at a glance. Move the height slider, tap a weight button, and the result appears straight away with a short daily guideline. The whole calculation runs in your browser, and the score is a general screening number, not a diagnosis.',
    howToSteps: [
      'Drag the Height slider to your height in centimetres; the label above it shows the current value.',
      'Tap one of the weight buttons: 70, 80, 90 or 100 kg.',
      'Read your BMI score, weight category and daily guideline in the Physical Evaluation Results box.',
    ],
    faqs: [
      {
        question: 'What is BMI?',
        answer:
          'BMI stands for Body Mass Index. It is your weight in kilograms divided by the square of your height in metres, and it is used as a quick screening number for weight categories.',
      },
      {
        question: 'What BMI ranges does the calculator use?',
        answer:
          'Below 18.5 is Underweight, 18.5 to 24.9 is Normal Weight (Healthy), 25 to 29.9 is Overweight, and 30 or above is Obese. These are the standard BMI cut-offs the tool shows.',
      },
      {
        question: 'Why can I only pick 70, 80, 90 or 100 kg?',
        answer:
          'The calculator uses four preset weight buttons, so the result is an estimate from the nearest preset rather than an exact figure for your precise weight. Use the closest button to your weight.',
      },
      {
        question: 'Is my BMI a medical diagnosis?',
        answer:
          'No. BMI is a general screening estimate and does not account for muscle mass, body composition, age or health conditions. Talk to a clinician before acting on the result.',
      },
      {
        question: 'Is my height and weight sent anywhere?',
        answer:
          'No. The calculation runs entirely in your browser and nothing you enter leaves your device.',
      },
    ],
    features: [
      'Instant BMI score with weight category',
      'Height slider with live centimetre readout',
      'Quick weight buttons for 70, 80, 90 and 100 kg',
      'Short daily guideline with every result',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'bmr-calc': {
    id: 'bmr-calc',
    howToTitle: 'How to estimate your BMR',
    howToIntro:
      'The BMR calculator estimates your Basal Metabolic Rate, the calories your body burns at complete rest, using the Mifflin-St Jeor equation. Enter your age, sex, weight and height, pick how active you are, and it shows your BMR plus the daily maintenance calories for that activity level. The result is a population-average estimate, clearly labelled as not medical advice.',
    howToSteps: [
      'Enter your age, pick Male or Female, and enter your weight and height; switch the kg/lb and cm/ft-in buttons if you prefer imperial units.',
      'Choose the activity level that best matches your week, from Sedentary to Extremely active.',
      'Click Estimate BMR to see your basal metabolic rate and your daily maintenance calories for that activity level.',
    ],
    faqs: [
      {
        question: 'What is BMR?',
        answer:
          'BMR is your Basal Metabolic Rate: the energy your body uses at complete rest to keep breathing, circulation and basic functions going. It is measured in calories per day.',
      },
      {
        question: 'Which formula does the calculator use?',
        answer:
          'It uses the Mifflin-St Jeor equation: for men, 10 x weight in kg + 6.25 x height in cm - 5 x age + 5; for women the same formula ends with -161 instead of +5. The formula is shown on the results panel.',
      },
      {
        question: 'What are the activity multipliers?',
        answer:
          'Sedentary is x1.2, Lightly active x1.375, Moderately active x1.55, Very active x1.725 and Extremely active x1.9. Your maintenance calories are your BMR multiplied by the level you pick.',
      },
      {
        question: 'What is a typical result?',
        answer:
          'For example, a 30-year-old man weighing 70 kg at 175 cm has a BMR of about 1,649 kcal per day, and about 2,556 kcal per day of maintenance at the moderate activity level.',
      },
      {
        question: 'Is this medical advice?',
        answer:
          'No. The result is a population-average estimate for healthy adults and does not account for body composition, illness or medication. Consult a clinician for personal guidance.',
      },
    ],
    features: [
      'Mifflin-St Jeor equation with the formula shown',
      'Metric and imperial units (kg/lb, cm/ft-in)',
      'Five activity levels with maintenance calories',
      'Worked example shown before you calculate',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'calorie-counter': {
    id: 'calorie-counter',
    howToTitle: 'How to track your daily calories',
    howToIntro:
      'The calorie tracker first estimates your daily calorie target from the Mifflin-St Jeor formula, then lets you log meals against it. Pick foods from the built-in list with standard calorie values, or add a custom food with its own calories per serving. The diary shows what you have eaten and what remains of your target, and it is saved on this device only.',
    howToSteps: [
      'Enter your sex, age, weight, height and activity level, then click Calculate Target to get your daily calorie target.',
      'Pick a food from the built-in list, set the number of servings and click Add Food, or add a custom food with its calories per serving.',
      'Watch the Eaten, Remaining and Target totals update as you log meals, and remove an entry or clear the diary any time.',
    ],
    faqs: [
      {
        question: 'How is my daily calorie target calculated?',
        answer:
          'From the Mifflin-St Jeor formula: your BMR from age, sex, weight and height, multiplied by an activity factor. For example, a 30-year-old man at 70 kg and 175 cm with moderate activity gets a target of about 2,556 kcal per day.',
      },
      {
        question: 'What foods are in the built-in list?',
        answer:
          'The list holds common foods with standard calorie values per serving, such as one medium apple at 95 kcal. If a food is missing, add it as a custom food with its calories per serving.',
      },
      {
        question: 'Can I log part of a serving?',
        answer:
          'Yes. Set the number of servings when you add a food, so half a portion or two portions are both counted correctly.',
      },
      {
        question: 'Where is my food diary stored?',
        answer:
          'On this device only. Nothing you log is uploaded or sent anywhere.',
      },
      {
        question: 'Is the calorie target medical advice?',
        answer:
          'No. It is a general estimate based on a population-average formula. It does not account for body composition, illness or medication, so treat it as a guide rather than a prescription.',
      },
    ],
    features: [
      'Daily target from the Mifflin-St Jeor formula',
      'Built-in food list with standard calorie values',
      'Custom foods with calories per serving',
      'Live Eaten, Remaining and Target totals',
      'Free, no signup, diary saved on your device only',
    ],
  },
  planner: {
    id: 'planner',
    howToTitle: 'How to plan your day hour by hour',
    howToIntro:
      'The daily planner turns your day into time blocks you can see at a glance. Add each task with a start and end time, and the planner lays them out on a timeline with your total planned time. Tasks that overlap are allowed but flagged, so clashes are easy to spot. Your plan is saved on this device only, and nothing is uploaded.',
    howToSteps: [
      'Type a task name, pick a start and end time, and add an optional note.',
      'Click Add Task; overlapping tasks are allowed but flagged on the timeline.',
      'Review your day on the timeline and the total planned time, and remove a task with its delete button when plans change.',
    ],
    faqs: [
      {
        question: 'Can two tasks overlap?',
        answer:
          'Yes. Overlapping tasks are allowed, but the planner flags them and shows the clash on the timeline so you can fix it.',
      },
      {
        question: 'Does the planner warn me when a task starts?',
        answer:
          'No. The planner is a visual day plan with a timeline and total planned time; it does not send alerts or notifications.',
      },
      {
        question: 'Are tasks that end when another starts treated as overlapping?',
        answer:
          'No. Tasks that only touch at the ends, where one ends exactly when the next begins, are not counted as overlapping.',
      },
      {
        question: 'Is my plan saved?',
        answer:
          'Yes, on this device only. Your tasks stay in the browser and are not uploaded anywhere.',
      },
      {
        question: 'Can I remove all tasks at once?',
        answer:
          'Yes. The Clear all tasks button removes every task from the day, and each task also has its own delete button.',
      },
    ],
    features: [
      'Time-block tasks with start and end times',
      'Timeline view with total planned time',
      'Overlapping tasks flagged, not blocked',
      'Optional note on every task',
      'Free, no signup, saved on your device only',
    ],
  },
  'breath-guide': {
    id: 'breath-guide',
    howToTitle: 'How to use box breathing',
    howToIntro:
      'The breathing guide runs symmetrical box breathing: a 16-second cycle split into four equal phases of inhale, hold, exhale and hold. An expanding sphere on screen shows you the pace, and the current phase is labelled so you can follow along without counting. It is a simple visual timer for slowing down and regulating stress, and it runs entirely in your browser.',
    howToSteps: [
      'Click Initiate Breathing Timer to start a 16-second box breathing cycle.',
      'Follow the expanding sphere and the on-screen phase: Inhale, Hold (Full), Exhale, then Hold (Empty), four seconds each.',
      'Keep breathing with the sphere for as many cycles as you like, then click Halt Training to stop.',
    ],
    faqs: [
      {
        question: 'What is box breathing?',
        answer:
          'Box breathing is a breathing pattern with four equal phases: breathe in, hold with full lungs, breathe out, and hold with empty lungs. This guide uses four seconds per phase, so one full cycle takes 16 seconds.',
      },
      {
        question: 'How long does one cycle take?',
        answer:
          '16 seconds: four phases of four seconds each. The cycle repeats until you stop it, so you can do as many rounds as you like.',
      },
      {
        question: 'Does the guide play sounds?',
        answer:
          'No. It is a visual guide: the sphere expands and contracts with the phases, and the current phase name is shown on screen.',
      },
      {
        question: 'Is this a medical treatment?',
        answer:
          'No. It is a simple breathing timer for relaxation. If you have a breathing or heart condition, or feel unwell while using it, stop and seek medical advice.',
      },
    ],
    features: [
      '16-second box breathing cycles, 4 seconds per phase',
      'Expanding sphere shows the breathing pace',
      'On-screen phase labels: Inhale, Hold, Exhale, Hold',
      'Start and stop any time',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'step-sim': {
    id: 'step-sim',
    howToTitle: 'How to estimate distance and calories from steps',
    howToIntro:
      'The step estimator converts a step count into distance, walking time, average speed and active calories. It estimates your stride from your height, works out how long the walk takes from your cadence, and picks a calorie rate from your average speed. Every formula is shown in the tool, so you can check the maths by hand. The numbers are population-average estimates, not measurements of a real walk.',
    howToSteps: [
      'Enter your step count, height, weight and walking cadence in steps per minute; optionally enter your measured stride in centimetres.',
      'Set your daily step goal if you want the result shown as a percentage of it.',
      'Click Estimate Walk to see distance in kilometres and miles, walking time, average speed and estimated active calories.',
    ],
    faqs: [
      {
        question: 'How is distance calculated?',
        answer:
          'Distance is steps multiplied by stride length. Stride is estimated as height x 0.414, or your own measured stride if you enter one. For example, 10,000 steps at 175 cm gives about 7.25 km.',
      },
      {
        question: 'How are calories calculated?',
        answer:
          'Calories are MET x weight in kg x hours walked, where MET is picked from your average walking speed: 2.8 below 3.2 km/h, 3.5 up to 4.8 km/h, 4.3 up to 6.4 km/h, and 5.0 above that. At 100 steps per minute, 10,000 steps at 70 kg burns about 408 kcal.',
      },
      {
        question: 'What is cadence?',
        answer:
          'Cadence is your walking pace in steps per minute. About 100 steps per minute is a moderate walk, and 120 or more is brisk. The tool divides your steps by your cadence to work out the walking time.',
      },
      {
        question: 'What step count can I enter?',
        answer:
          'From 0 to 200,000 steps. The default daily goal is 10,000 steps, and you can change it to any value from 1,000 to 100,000.',
      },
      {
        question: 'Are these numbers exact?',
        answer:
          'No. They are population-average estimates: real stride, terrain and fitness change the true numbers. The tool labels the result as an estimate, not a measurement or medical advice.',
      },
    ],
    features: [
      'Distance in kilometres and miles from steps',
      'Walking time and average speed',
      'Active calories from speed-based MET values',
      'Optional measured stride and custom step goal',
      'Free, no signup, all formulas shown in the tool',
    ],
  },
  'habit-tracker': {
    id: 'habit-tracker',
    howToTitle: 'How to track your daily habits',
    howToIntro:
      'The habit tracker keeps a short list of daily habits you can tick off as you do them. It starts with three examples: Morning stretch, Drink 60oz of water, and Read for 15 minutes. Tap a habit to mark it done, tap again to undo it, and your ticks are saved in the browser so they are still there when you come back. No account, no uploads, just a simple daily checklist.',
    howToSteps: [
      'Look at the Today\u2019s Habits list, which starts with Morning stretch, Drink 60oz of water, and Read for 15 minutes.',
      'Tap a habit to mark it done for today; tap it again to undo it.',
      'Come back tomorrow: your ticks are saved on this device, so they are still there when you reload the page.',
    ],
    faqs: [
      {
        question: 'How do I mark a habit as done?',
        answer:
          'Tap the habit in the list. A done habit is highlighted and crossed out, and tapping it again undoes it.',
      },
      {
        question: 'Can I add my own habits?',
        answer:
          'No. The tracker ships with a fixed starter list of three habits: Morning stretch, Drink 60oz of water, and Read for 15 minutes. You tick those off each day.',
      },
      {
        question: 'Are my ticks saved?',
        answer:
          'Yes. Your ticks are stored in your browser on this device, so a habit you marked done stays done after you reload the page.',
      },
      {
        question: 'Do I need an account?',
        answer:
          'No. The tracker is free with no signup, and nothing is uploaded anywhere.',
      },
    ],
    features: [
      'One-tap done and undo for each habit',
      'Three starter habits included',
      'Ticks saved in your browser between visits',
      'Done habits shown crossed out and highlighted',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'water-tracker': {
    id: 'water-tracker',
    howToTitle: 'How to log your daily water intake',
    howToIntro:
      'The water tracker is a simple daily log: every glass you drink adds 8 ounces to the total, and a glass on screen fills up as you go. The daily standard shown is 80 ounces, so you can see how close you are at a glance. Your total is saved in the browser, so it survives a reload, and you can reset it to zero for a new day.',
    howToSteps: [
      'Click +8 oz Glass each time you finish a glass of water.',
      'Watch the glass fill and the ounce total rise; the daily standard shown is 80 ounces.',
      'Click Reset to clear the tally for a new day; your total is saved on this device between visits.',
    ],
    faqs: [
      {
        question: 'How much water is one glass?',
        answer:
          'Each click of the +8 oz Glass button logs 8 ounces, which is one standard glass of water.',
      },
      {
        question: 'What is the daily target?',
        answer:
          'The tool shows 80 ounces as the recommended daily standard, which is ten 8-ounce glasses.',
      },
      {
        question: 'Is my water log saved?',
        answer:
          'Yes. Your total is stored in your browser on this device, so it is still there after you reload the page.',
      },
      {
        question: 'How do I start a new day?',
        answer:
          'Click the Reset button. It clears the tally back to zero so you can start logging the new day.',
      },
      {
        question: 'Is 80 ounces right for everyone?',
        answer:
          'No. It is a general daily standard shown by the tool, not personal medical advice. Your needs vary with body size, activity and climate, so use it as a guide.',
      },
    ],
    features: [
      'One-click logging of 8-ounce glasses',
      'Visual glass that fills as you drink',
      '80-ounce daily standard shown',
      'Total saved in your browser between visits',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'sleep-calculator': {
    id: 'sleep-calculator',
    howToTitle: 'How to find your best bedtime',
    howToIntro:
      'The sleep calculator plans around 90-minute sleep cycles, because waking between cycles rather than in the middle of one is what makes mornings feel easier. Tell it when you want to wake up and it lists bedtimes for whole cycles, allowing about 15 minutes to fall asleep. Or pick the sleep-now mode to get wake-up times from the current time on your device.',
    howToSteps: [
      'Choose I want to wake up at and set your wake-up time, or choose I want to sleep now to use the current time.',
      'Click Calculate Bedtimes, or Calculate Wake Times, to see times that land at the end of whole 90-minute sleep cycles.',
      'Pick a time with enough cycles: for a 7:00 AM wake-up, 9:45 PM gives six cycles and 11:15 PM gives five.',
    ],
    faqs: [
      {
        question: 'Why 90-minute cycles?',
        answer:
          'Sleep runs in roughly 90-minute cycles, and waking at the end of a cycle rather than in the middle of one usually feels easier. The calculator lists times that complete whole cycles.',
      },
      {
        question: 'Why does it add 15 minutes?',
        answer:
          'The calculator allows about 15 minutes to fall asleep, so a bedtime is set 15 minutes before the cycles start counting. A six-cycle night is 9 hours of sleep plus those 15 minutes in bed.',
      },
      {
        question: 'What bedtimes does it give for a 7:00 AM wake-up?',
        answer:
          'Six cycles gives 9:45 PM and five cycles gives 11:15 PM. It also lists shorter options down to a single cycle, with the most sleep first.',
      },
      {
        question: 'How does the sleep-now mode work?',
        answer:
          'It uses the current time on your device as your bedtime and shows the wake-up times at the end of whole sleep cycles after it.',
      },
      {
        question: 'Is this medical advice?',
        answer:
          'No. It is a planning aid built on the 90-minute cycle idea, not a diagnosis or treatment for sleep problems. If you regularly struggle to sleep, talk to a clinician.',
      },
    ],
    features: [
      'Bedtimes for whole 90-minute sleep cycles',
      'Wake-up mode and sleep-now mode',
      '15 minutes to fall asleep built in',
      'Options from one to six cycles',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'password-gen': {
    id: 'password-gen',
    howToTitle: 'How to generate a secure password',
    howToIntro:
      'The password generator creates random passwords from your browser\u2019s cryptographic random source, crypto.getRandomValues, so nothing is sent anywhere and nothing is predictable. Choose a length from 4 to 64 characters, pick which character sets to include, and it guarantees at least one character from each set you selected. It also shows the estimated entropy in bits, so you can judge the strength.',
    howToSteps: [
      'Drag the Password length slider, from 4 to 64 characters, to the length you want.',
      'Toggle the character sets you want: lowercase, uppercase, digits and symbols, and optionally exclude ambiguous characters like 0, O, 1, l and I.',
      'Click Generate Password, check the estimated entropy in bits, and copy the result with the copy button.',
    ],
    faqs: [
      {
        question: 'Are the passwords really random?',
        answer:
          'Yes. They are drawn from crypto.getRandomValues, your browser\u2019s cryptographic random source, using rejection sampling with no modulo bias. The tool never uses Math.random, and no password leaves your browser.',
      },
      {
        question: 'How long should my password be?',
        answer:
          'Longer is stronger. A 16-character password using all four character sets has about 103 bits of entropy. The tool shows the entropy of each password it generates, with a strength label.',
      },
      {
        question: 'What does entropy mean?',
        answer:
          'Entropy in bits measures how hard a password is to guess: each extra bit doubles the number of combinations an attacker would have to try. The tool displays the estimated bits for every password it creates.',
      },
      {
        question: 'What are ambiguous characters?',
        answer:
          'Characters that look alike in some fonts: 0, O, 1, l and I. The Exclude ambiguous characters option leaves them out, which helps when you need to read or type a password by hand.',
      },
      {
        question: 'Is my generated password stored anywhere?',
        answer:
          'No. It is generated in your browser and never sent or stored. Copy it to your password manager and close the page when you are done.',
      },
    ],
    features: [
      'Cryptographic randomness via crypto.getRandomValues',
      'Length from 4 to 64 characters',
      'Lowercase, uppercase, digits and symbols',
      'Entropy in bits with a strength label',
      'Free, no signup, nothing leaves your browser',
    ],
  },
  'dice-roller': {
    id: 'dice-roller',
    howToTitle: 'How to roll dice online',
    howToIntro:
      'The dice roller gives you instant polyhedral dice for tabletop games: D4, D6, D8, D10, D12 and D20. Click a die and the result appears right away, with a roll log so you can follow the session. The rolls are uniformly random, and the tool is for casual entertainment, not for gambling. No download, no signup, just pick a die and roll.',
    howToSteps: [
      'Pick a die, D4, D6, D8, D10, D12 or D20, and click its Roll button.',
      'Read the result in the display, for example Rolled D20: 20.',
      'Roll again as often as you like, or click Reset Roll to clear the display.',
    ],
    faqs: [
      {
        question: 'Which dice can I roll?',
        answer:
          'Six polyhedral dice: D4, D6, D8, D10, D12 and D20. Each has its own Roll button, and every result is within the range of the die you picked.',
      },
      {
        question: 'Are the rolls fair?',
        answer:
          'Yes. Rolls are uniformly random, so every face of the die has an equal chance. The tool is for casual tabletop entertainment.',
      },
      {
        question: 'Can I use it for gambling?',
        answer:
          'No. The tool itself says it is for casual tabletop entertainment, uniformly random, not for gambling.',
      },
      {
        question: 'Does it keep a history of my rolls?',
        answer:
          'Each roll is logged in the session log below the workspace, for example Rolled D20 and got: 20, so you can follow the rolls in your current session.',
      },
    ],
    features: [
      'D4, D6, D8, D10, D12 and D20 dice',
      'Instant result with a roll log',
      'Uniformly random results',
      'Reset Roll to clear the display',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'rock-paper-scissors': {
    id: 'rock-paper-scissors',
    howToTitle: 'How to play rock paper scissors',
    howToIntro:
      'Rock Paper Scissors on Omnitily is a quick game against a random computer opponent. Pick one of the three gestures, and the result appears at once with both choices shown, so you can see exactly why you won, lost or drew. Your wins are counted in a running score, and you can reset it any time. It is a simple, fast game for a break between tasks.',
    howToSteps: [
      'Click Rock, Paper or Scissors to play a round against the computer.',
      'Read the result, for example Player: ROCK vs Computer: SCISSORS, YOU WIN! ROCK beats SCISSORS.',
      'Keep playing to build your score, or click Reset to start the score over.',
    ],
    faqs: [
      {
        question: 'How do I win?',
        answer:
          'Rock beats scissors, scissors beats paper, and paper beats rock. If both sides pick the same gesture, the round is a draw.',
      },
      {
        question: 'Who am I playing against?',
        answer:
          'A random computer opponent. It picks its gesture at random each round, so no round is rigged in advance.',
      },
      {
        question: 'How is the score counted?',
        answer:
          'Your score counts your wins and is shown under the result panel. It goes up by one each time you win a round, and the Reset button starts it over.',
      },
      {
        question: 'Can I play more than one round?',
        answer:
          'Yes. Click a gesture again to play the next round right away; there is no limit on rounds.',
      },
    ],
    features: [
      'Instant rounds against a random computer opponent',
      'Both choices shown with the result explained',
      'Running win score with a reset button',
      'Rock, paper and scissors with draw handling',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'tic-tac-toe': {
    id: 'tic-tac-toe',
    howToTitle: 'How to play tic-tac-toe',
    howToIntro:
      'Tic-tac-toe on Omnitily is the classic 3x3 grid game, played against an unbeatable computer opponent or against a friend on the same device. You play as X and try to get three marks in a row, across, down or diagonally. The computer uses minimax, so it always takes a win when it can and blocks yours, which means the best you can do against it is a draw.',
    howToSteps: [
      'Choose Vs Computer or 2 Players; you play as X.',
      'Click an empty square to place your mark; against the computer it answers with O after every move.',
      'Get three in a row to win, then check the scoreboard and click New Game to play again.',
    ],
    faqs: [
      {
        question: 'Can I beat the computer?',
        answer:
          'No, not if you play perfectly or not: the computer uses minimax and plays perfectly, so it always takes a win when one exists, blocks your win otherwise, and never loses. The best result against it is a draw.',
      },
      {
        question: 'Can two people play?',
        answer:
          'Yes. Switch to 2 Players mode and pass the device back and forth; X and O take turns on the same board.',
      },
      {
        question: 'How do I win?',
        answer:
          'Get three of your marks in a row: across, down, or diagonally, before your opponent does. If the board fills with no winner, the game is a draw.',
      },
      {
        question: 'Does the game keep score?',
        answer:
          'Yes. The scoreboard tracks wins, losses and draws. New Game starts a fresh board, and Reset Score clears the scoreboard.',
      },
    ],
    features: [
      'Vs Computer mode with an unbeatable minimax opponent',
      '2 Players mode on the same device',
      'Scoreboard for wins, losses and draws',
      'New Game and Reset Score buttons',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'name-picker': {
    id: 'name-picker',
    howToTitle: 'How to pick a random winner',
    howToIntro:
      'The random name picker, or selector wheel, picks a winner from a list you type in. Enter names or choices one per line, press Pick a Winner, and the wheel spins through the entries before landing on one. The pick uses crypto.getRandomValues, so every name has an equal chance. It is handy for giveaways, choosing teams, or deciding who goes first.',
    howToSteps: [
      'Type your names or choices into the box, one per line.',
      'Click Pick a Winner and watch the wheel spin through the entries.',
      'Read the winner banner, then click Pick a Winner again or Clear to start a new list.',
    ],
    faqs: [
      {
        question: 'How do I enter names?',
        answer:
          'Type them into the box with one name or choice per line. The label above the box shows how many entries you have typed.',
      },
      {
        question: 'Is the pick fair?',
        answer:
          'Yes. The pick uses a cryptographically secure random source, crypto.getRandomValues, so every name in the list has an equal chance of winning.',
      },
      {
        question: 'What can I use it for?',
        answer:
          'Giveaways, picking teams, choosing who goes first, raffles, or any decision where a fair random pick from a list is needed.',
      },
      {
        question: 'Can I pick again from the same list?',
        answer:
          'Yes. Click Pick a Winner again to spin for another winner from the same list, or Clear to empty the box and start over.',
      },
    ],
    features: [
      'One name or choice per line',
      'Spinning wheel with a winner banner',
      'Fair picks via crypto.getRandomValues',
      'Pick again or clear the list any time',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'love-calculator': {
    id: 'love-calculator',
    howToTitle: 'How to calculate love compatibility',
    howToIntro:
      'The love calculator is a light-hearted name comparison for fun. Type two names, and it turns them into a compatibility score from 30 to 100. The score comes from a simple name hash, not from any real assessment of two people, and the same two names always give the same score. It is labelled for entertainment only, and it runs entirely in your browser.',
    howToSteps: [
      'Type the first name into the first box and the second name into the second box.',
      'Click Calculate Compatibility to see the score, from 30 to 100.',
      'Remember the score is a deterministic name hash for fun: the same two names always give the same score.',
    ],
    faqs: [
      {
        question: 'How is the compatibility score calculated?',
        answer:
          'Both names are lowercased and hashed with the FNV-1a hash into a score from 30 to 100. There is no randomness and no real compatibility analysis behind it.',
      },
      {
        question: 'Will the same two names always get the same score?',
        answer:
          'Yes. The score is deterministic: enter Alex and Sam and you always get 39%. The order of the names does not change the result either.',
      },
      {
        question: 'Is the score real?',
        answer:
          'No. It is a toy score for entertainment only, made from a name hash. It is not a real measure of compatibility between two people.',
      },
      {
        question: 'Is my data sent anywhere?',
        answer:
          'No. The names are hashed in your browser and nothing leaves your device.',
      },
    ],
    features: [
      'Compatibility score from 30 to 100',
      'Deterministic: same names, same score',
      'Transparent method explained in the tool',
      'Clearly labelled for entertainment only',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'trivia-quiz': {
    id: 'trivia-quiz',
    howToTitle: 'How to play the trivia quiz',
    howToIntro:
      'The offline trivia quiz asks 12 multiple-choice general knowledge questions, shuffled into a new order every round. Questions cover science, geography, maths, nature, literature and music, and everything is built in, so no internet is needed while you play. Your best score is saved on the device, and scoring 9 or more sets off a small celebration.',
    howToSteps: [
      'Click Start Quiz to begin the 12-question round; the questions are shuffled every time.',
      'Tap one of the four answer choices for each question and continue through all 12.',
      'See your final score out of 12, with your best score saved on this device; click Play Again for a freshly shuffled round.',
    ],
    faqs: [
      {
        question: 'How many questions are in the quiz?',
        answer:
          '12 multiple-choice questions per round, covering science, geography, maths, nature, literature and music. The order is shuffled every time you play.',
      },
      {
        question: 'Do I need the internet to play?',
        answer:
          'No. The quiz is offline: all 12 questions are built into the tool, so it works with no connection.',
      },
      {
        question: 'Is my best score saved?',
        answer:
          'Yes. Your best score out of 12 is saved in your browser on this device and shown on the start screen.',
      },
      {
        question: 'What happens if I score 9 or more?',
        answer:
          'A confetti celebration fires when you finish with 9 or more correct answers out of 12.',
      },
    ],
    features: [
      '12 multiple-choice general knowledge questions',
      'Fresh shuffle every round',
      'Six categories: science, geography, maths, nature, literature, music',
      'Best score saved on your device',
      'Free, no signup, works fully offline',
    ],
  },
  'reaction-test': {
    id: 'reaction-test',
    howToTitle: 'How to test your reaction time',
    howToIntro:
      'The reaction time tester measures how fast you respond to a visual cue, in exact milliseconds. Press Start, wait for the panel to turn green after a random delay, and click as fast as you can. Clicking too early counts as a false start. Average human reaction is around 250 ms, and the tool rates each attempt and tracks your best and average times.',
    howToSteps: [
      'Click Start Test, then wait: the panel turns green after a random delay.',
      'Click the panel as fast as you can the moment it turns green; clicking too early shows Too soon!',
      'Read your time in milliseconds and the rating, repeat for more attempts, and check your best and average times.',
    ],
    faqs: [
      {
        question: 'How does the test work?',
        answer:
          'You press Start, the panel stays amber for a random delay, then turns green. The timer starts when it turns green and stops when you click, giving your reaction time in milliseconds.',
      },
      {
        question: 'What is a good reaction time?',
        answer:
          'Average human reaction is around 250 ms. Under 200 ms is rated lightning fast, under 250 ms excellent, under 350 ms good and around the human average, and over 500 ms slow.',
      },
      {
        question: 'What happens if I click too early?',
        answer:
          'Clicking before the panel turns green shows Too soon! and the attempt does not count. Click again to try the round over.',
      },
      {
        question: 'Does it track my best and average times?',
        answer:
          'Yes. The panel shows your attempts, your best time and your average time across attempts, and the Reset button clears them.',
      },
    ],
    features: [
      'Reaction time measured in exact milliseconds',
      'Random delay so you cannot predict the green',
      'Too-early clicks flagged as Too soon!',
      'Best and average times across attempts',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'anagram-solver': {
    id: 'anagram-solver',
    howToTitle: 'How to solve an anagram',
    howToIntro:
      'The anagram solver unscrambles letters into real words from a built-in English word list of common words from 2 to 8 letters long. Find exact anagrams that use every letter, or switch modes to see every word the letters can spell. It is handy for word games, crosswords and Scrabble practice, and it runs entirely in your browser with no internet needed.',
    howToSteps: [
      'Type the letters into the box, for example listen.',
      'Choose Exact anagrams to use all the letters, or the words-from-letters mode to find every word the letters can spell.',
      'Click Solve Anagram to see the matching words from the built-in English word list.',
    ],
    faqs: [
      {
        question: 'What is an exact anagram?',
        answer:
          'An exact anagram uses every letter you typed, rearranged into a different word. For example, listen gives enlist, silent and tinsel as well as listen itself.',
      },
      {
        question: 'What does the words-from-letters mode do?',
        answer:
          'Instead of using all the letters, it finds every word in the built-in list that can be spelled from some of your letters, which is useful when you want shorter options.',
      },
      {
        question: 'How big is the word list?',
        answer:
          'The tool uses a bundled list of about 370 common English words, from 2 to 8 letters long. Only words in that list can be returned.',
      },
      {
        question: 'Can it help with Scrabble?',
        answer:
          'Yes. The tool description notes it finds valid high-scoring Scrabble words from mixed letters, though it only knows the words in its built-in list.',
      },
    ],
    features: [
      'Exact anagrams using all your letters',
      'Words-from-letters mode for shorter words',
      'Built-in list of about 370 common English words',
      'Works fully offline in your browser',
      'Free, no signup, nothing leaves your device',
    ],
  },
  'sudoku-solver': {
    id: 'sudoku-solver',
    howToTitle: 'How to solve a Sudoku puzzle',
    howToIntro:
      'The Sudoku tool lets you type a 9x9 puzzle, solve it with a real backtracking solver, or check your own solution. A sample puzzle is loaded when you open it, so you can try the solver straight away. The solver tries digits in the most constrained empty cell first and backtracks when a choice leads nowhere; if the puzzle contradicts itself, it tells you instead of guessing.',
    howToSteps: [
      'Click a cell and type a digit from 1 to 9 to fill the 9x9 grid, or click Load Sample to start from a ready puzzle.',
      'Click Solve Puzzle to let the backtracking solver complete the grid, or Check My Solution to test your own answers.',
      'Watch the colours: white numbers are the given clues, green numbers are yours or the solver\u2019s, and red cells conflict with their row, column or box.',
    ],
    faqs: [
      {
        question: 'How does the solver work?',
        answer:
          'It uses backtracking: it tries digits in the most constrained empty cell first, backtracks when a choice leads to a dead end, and only stops when every row, column and 3x3 box holds 1 to 9 exactly once.',
      },
      {
        question: 'What if my puzzle has no solution?',
        answer:
          'The solver tells you instead of guessing. A contradictory puzzle returns no solution and the tool says so, rather than filling in wrong digits.',
      },
      {
        question: 'Can I paste a puzzle in as text?',
        answer:
          'Yes. Paste an 81-character string of digits, using 0 for empty cells, into the paste box and click Load Pasted Puzzle.',
      },
      {
        question: 'What do the colours mean?',
        answer:
          'White numbers are the given puzzle clues, green numbers are digits you typed or the solver filled in, and red cells mark a digit that conflicts with its row, column or box.',
      },
      {
        question: 'Can I check my own solution without solving?',
        answer:
          'Yes. Fill the grid yourself and click Check My Solution to have the tool validate your answers.',
      },
    ],
    features: [
      'Real backtracking solver for 9x9 Sudoku',
      'Sample puzzle loaded to start',
      'Check My Solution validates your own answers',
      'Paste an 81-digit puzzle as text',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'morse-translator': {
    id: 'morse-translator',
    howToTitle: 'How to translate Morse code',
    howToIntro:
      'The Morse code translator converts standard text into Morse code dots and dashes, and decodes Morse code back into text. Type a message, translate it in either direction, and then play the result back as audio beeps with the Hear Morse Sound button. It is a quick way to learn Morse code, send a coded note, or check a translation you are unsure about.',
    howToSteps: [
      'Type your text into the input box.',
      'Click Text to Morse to encode it, or Morse to Text to decode Morse code back to text.',
      'Click Hear Morse Sound to play the encoded message as audio beeps.',
    ],
    faqs: [
      {
        question: 'What does SOS look like in Morse code?',
        answer:
          'SOS translates to ... --- ..., three dots, three dashes, three dots. You can translate it in the tool and play it back as sound.',
      },
      {
        question: 'Can I decode Morse code back to text?',
        answer:
          'Yes. Paste or type Morse code using dots and dashes, then click Morse to Text to decode it back to standard text.',
      },
      {
        question: 'Can I hear the Morse code?',
        answer:
          'Yes. Once a translation is shown, the Hear Morse Sound button plays the encoded message as audio beeps in your browser.',
      },
      {
        question: 'Does the translator need the internet?',
        answer:
          'No. Translation runs entirely in your browser, so it works offline.',
      },
    ],
    features: [
      'Text to Morse and Morse to text',
      'Audio playback of the encoded message',
      'Standard Morse code for letters and numbers',
      'Works fully offline in your browser',
      'Free, no signup, nothing leaves your device',
    ],
  },
  'html-entities': {
    id: 'html-entities',
    howToTitle: 'How to encode HTML entities',
    howToIntro:
      'The HTML entity encoder turns characters that have special meaning in HTML, like <, > and &, into safe entity codes such as &lt;, &gt; and &amp;, so they display as text instead of being read as markup. It also encodes quotes and non-ASCII characters as numeric entities, and it can decode entities back to the original characters. Useful whenever you paste code into a page or a post.',
    howToSteps: [
      'Paste or type the text or code into the input box.',
      'Click Encode HTML Entities to turn characters like <, > and & into safe codes such as &lt; and &amp;.',
      'Click Decode HTML Entities to turn codes back into the original characters.',
    ],
    faqs: [
      {
        question: 'What is an HTML entity?',
        answer:
          'An HTML entity is a code that stands for a character with special meaning in HTML. For example, &lt; displays as < and &amp; displays as &, without the browser treating them as markup.',
      },
      {
        question: 'Which characters does it encode?',
        answer:
          'The five basics, & < > " and apostrophe, become &amp;, &lt;, &gt;, &quot; and &#39;. Non-ASCII characters are encoded as numeric entities using their character code.',
      },
      {
        question: 'Can it decode entities too?',
        answer:
          'Yes. Click Decode HTML Entities to turn named entities like &lt; and &amp;, decimal entities like &#39;, and hex entities back into the original characters.',
      },
      {
        question: 'Why would I encode HTML?',
        answer:
          'To show code or special characters as plain text on a web page, in a blog post, or in documentation, without the browser reading them as markup or breaking the page.',
      },
    ],
    features: [
      'Encode and decode HTML entities',
      'Handles named, decimal and hex entities',
      'Non-ASCII characters become numeric entities',
      'Works fully offline in your browser',
      'Free, no signup, nothing leaves your device',
    ],
  },
  'text-reverser': {
    id: 'text-reverser',
    howToTitle: 'How to reverse text',
    howToIntro:
      'The text reverser flips text backwards in two ways: character by character, or word by word. Reverse Characters turns abc into cba, and Reverse Words turns one two three into three two one. It is a small, instant utility for wordplay, puzzles, or just seeing a sentence backwards, and it runs entirely in your browser.',
    howToSteps: [
      'Type or paste your text into the input box.',
      'Click Reverse Characters to flip every character, or Reverse Words to flip the word order.',
      'Copy the reversed text from the output box.',
    ],
    faqs: [
      {
        question: 'What is the difference between the two modes?',
        answer:
          'Reverse Characters flips every character, so abc becomes cba. Reverse Words keeps each word intact but flips their order, so one two three becomes three two one.',
      },
      {
        question: 'Can it reverse a whole list?',
        answer:
          'Yes. Paste a list and use Reverse Words to flip the order of the items, or Reverse Characters to mirror every line. The tool description notes it can flip characters, complete words, or entire lists backward.',
      },
      {
        question: 'Does it change my original text?',
        answer:
          'No. Your input stays in the input box and the reversed version appears in the output box, so you can copy it or clear the fields and start again.',
      },
    ],
    features: [
      'Reverse Characters mode',
      'Reverse Words mode',
      'Handles whole lists as well as sentences',
      'Instant result with no page reload',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'line-remover': {
    id: 'line-remover',
    howToTitle: 'How to remove duplicate lines',
    howToIntro:
      'The duplicate line remover cleans up lists by dropping repeated lines while keeping the original order. Paste a list, choose whether to trim whitespace, remove blank lines and match case, then click Deduplicate Lines. The first occurrence of each line is kept and later repeats are removed, so a messy list becomes a clean one without reordering anything.',
    howToSteps: [
      'Paste your list into the input box, one item per line.',
      'Tick Trim whitespace and Remove blank lines if you want them cleaned up, and choose case-sensitive matching if needed.',
      'Click Deduplicate Lines: the first occurrence of each line is kept and the original order is preserved.',
    ],
    faqs: [
      {
        question: 'Does it keep the original order?',
        answer:
          'Yes. The first occurrence of each line is kept in its original position, and only later repeats are removed. The list is never re-sorted.',
      },
      {
        question: 'What does Trim whitespace do?',
        answer:
          'It strips leading and trailing spaces from each line before comparing, so lines that differ only by extra spaces count as duplicates.',
      },
      {
        question: 'What does case-sensitive matching do?',
        answer:
          'When case-sensitive is on, Apple and apple count as different lines. When it is off, they count as the same line and only the first is kept.',
      },
      {
        question: 'Does it remove blank lines?',
        answer:
          'Only if you tick Remove blank lines. Otherwise blank lines are kept as they are.',
      },
      {
        question: 'What is an example?',
        answer:
          'Pasting a,b,a,c,b and clicking Deduplicate Lines gives a,b,c: the first a and the first b are kept, and the repeats are removed.',
      },
    ],
    features: [
      'Removes duplicate lines, keeps first occurrence',
      'Original order preserved, never re-sorted',
      'Trim whitespace and remove blank lines options',
      'Case-sensitive or case-insensitive matching',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'sentence-generator': {
    id: 'sentence-generator',
    howToTitle: 'How to generate writing prompts',
    howToIntro:
      'The creative prompt generator produces random sentence prompts and vocabulary combinations for writing exercises. Pick a prompt type, such as a statement, a question, an exclamation or a story prompt, choose how many sentences you want, and generate a fresh set each time. You can copy them all or download them as a text file, which makes it handy for warm-ups, journaling and classroom exercises.',
    howToSteps: [
      'Pick a prompt type, Statement, Question, Exclamation, Story Prompt or Surprise Me, and set how many sentences you want.',
      'Click Generate to create a fresh set of sentences.',
      'Copy them all or click Download .txt to save them as a text file.',
    ],
    faqs: [
      {
        question: 'What kinds of sentences can it generate?',
        answer:
          'Five prompt types: Statement, Question, Exclamation, Story Prompt, and Surprise Me, which mixes them. Each type builds sentences from built-in word and phrase lists.',
      },
      {
        question: 'How many sentences can I generate at once?',
        answer:
          'You set the count with the How Many control; five sentences is the default, and you can generate a different number each time.',
      },
      {
        question: 'Are the sentences the same every time?',
        answer:
          'No. Each click of Generate produces a fresh set of sentences from the built-in lists, so you get new prompts on every run.',
      },
      {
        question: 'Can I save the sentences?',
        answer:
          'Yes. Copy them all with the copy button, or click Download .txt to save them as a text file on your device.',
      },
    ],
    features: [
      'Five prompt types including story prompts',
      'Choose how many sentences to generate',
      'Fresh set of sentences on every click',
      'Copy all or download as a .txt file',
      'Free, no signup, runs entirely in your browser',
    ],
  },
  'text-sorter': {
    id: 'text-sorter',
    howToTitle: 'How to sort lines alphabetically',
    howToIntro:
      'The alphabetical line sorter arranges a list one item per line into order: A to Z, Z to A, or numerically up and down. It sorts lines, not words inside a line, and it compares letters without caring about case, so apple and Banana sort by their letters rather than by capitalisation. Paste a list, click a sort button, and the sorted list appears in the output box.',
    howToSteps: [
      'Paste your list into the input box, one item per line.',
      'Click A to Z for alphabetical order, Z to A for reverse, or Numeric up and down to sort by number.',
      'Copy the sorted list from the output box.',
    ],
    faqs: [
      {
        question: 'What does the sorter sort?',
        answer:
          'Whole lines. Each line of your pasted list is one item, and the sorter reorders the lines. For example, banana, apple and cherry become apple, banana and cherry with A to Z.',
      },
      {
        question: 'Is the alphabetical sort case-sensitive?',
        answer:
          'No. It compares letters without caring about case, so Apple and banana sort by their letters rather than by capitalisation.',
      },
      {
        question: 'What do the numeric sort buttons do?',
        answer:
          'Numeric up and Numeric down sort lines by the number at the start of each line, so 2, 10 and 3 sort as 2, 3, 10 instead of 10, 2, 3. Lines without a number fall back to alphabetical order.',
      },
      {
        question: 'Can it sort by string length or in reverse?',
        answer:
          'The tool description mentions sorting alphabetically, numerically, in reverse, or by string length with filters, but the workspace itself offers four buttons: A to Z, Z to A, Numeric up and Numeric down.',
      },
    ],
    features: [
      'A to Z and Z to A alphabetical sorting',
      'Numeric ascending and descending sorting',
      'Case-insensitive letter comparison',
      'Sorts whole lines, one item per line',
      'Free, no signup, runs entirely in your browser',
    ],
  },
};
