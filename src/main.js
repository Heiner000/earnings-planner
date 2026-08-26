import "./style.css";
import { initializeCalendar } from "./calendar";

document.querySelector("#app").innerHTML = `
  <div class="min-h-screen bg-slate-100 text-slate-900">

    <!-- ========================================
         HEADER
    ========================================= -->
    <header class="border-b border-slate-200 bg-white">
      <div
        class="
          mx-auto flex max-w-7xl items-center justify-between
          px-4 py-4
          sm:px-6
          lg:px-8
        "
      >
        <div>
          <h1 class="text-2xl font-bold tracking-tight">
            Earnings Planner
          </h1>

          <p class="mt-1 hidden text-sm text-slate-500 sm:block">
            Plan your hours. Predict your paycheck. Track your cash flow.
          </p>
        </div>

        <button
          id="settings-button"
          type="button"
          class="
            rounded-lg border border-slate-300
            bg-white px-3 py-2
            text-sm font-medium
            shadow-sm
            transition
            hover:bg-slate-50
          "
        >
          Settings
        </button>
      </div>
    </header>


    <!-- ========================================
         APPLICATION
    ========================================= -->
    <main
      class="
        mx-auto max-w-7xl
        space-y-6
        px-4 py-6
        sm:px-6
        lg:px-8
      "
    >

      <!-- ======================================
           SUMMARY DASHBOARD
      ======================================= -->
      <section aria-labelledby="summary-heading">

        <div class="mb-3 flex items-center justify-between">
          <h2
            id="summary-heading"
            class="text-lg font-semibold"
          >
            Overview
          </h2>

          <span id="overview-month" class="text-sm text-slate-500">
          </span>
        </div>


        <!-- Summary cards -->
        <div
          class="
            grid grid-cols-2 gap-3
            lg:grid-cols-5
          "
        >

          <!-- Weekly income -->
          <article
            class="
              rounded-xl border border-slate-200
              bg-white p-4 shadow-sm
            "
          >
            <p class="text-sm font-medium text-slate-500">
              Weekly Income
            </p>

            <p
              id="weekly-income"
              class="mt-2 text-xl font-bold text-emerald-600"
            >
              $0.00
            </p>
          </article>


          <!-- Weekly expenses -->
          <article
            class="
              rounded-xl border border-slate-200
              bg-white p-4 shadow-sm
            "
          >
            <p class="text-sm font-medium text-slate-500">
              Weekly Expenses
            </p>

            <p
              id="weekly-expenses"
              class="mt-2 text-xl font-bold text-red-600"
            >
              $0.00
            </p>
          </article>


          <!-- Monthly income -->
          <article
            class="
              rounded-xl border border-slate-200
              bg-white p-4 shadow-sm
            "
          >
            <p class="text-sm font-medium text-slate-500">
              Monthly Income
            </p>

            <p
              id="monthly-income"
              class="mt-2 text-xl font-bold text-emerald-600"
            >
              $0.00
            </p>
          </article>


          <!-- Monthly expenses -->
          <article
            class="
              rounded-xl border border-slate-200
              bg-white p-4 shadow-sm
            "
          >
            <p class="text-sm font-medium text-slate-500">
              Monthly Expenses
            </p>

            <p
              id="monthly-expenses"
              class="mt-2 text-xl font-bold text-red-600"
            >
              $0.00
            </p>
          </article>


          <!-- Projected balance -->
          <article
            class="
              col-span-2 rounded-xl
              border border-slate-200
              bg-slate-900 p-4
              text-white shadow-sm
              lg:col-span-1
            "
          >
            <p class="text-sm font-medium text-slate-300">
              Projected Balance
            </p>

            <p
              id="projected-balance"
              class="mt-2 text-xl font-bold"
            >
              $0.00
            </p>
          </article>

        </div>
      </section>


      <!-- ======================================
           MAIN WORKSPACE
      ======================================= -->
      <div
        class="
          grid gap-6
          lg:grid-cols-[minmax(0,1fr)_280px]
        "
      >

        <!-- ====================================
             CALENDAR
        ===================================== -->
        <section
          class="
            overflow-hidden rounded-xl
            border border-slate-200
            bg-white shadow-sm
          "
          aria-labelledby="calendar-heading"
        >

          <!-- Calendar header -->
          <div
            class="
              flex items-center justify-between
              border-b border-slate-200
              px-4 py-4
              sm:px-6
            "
          >
            <button
              id="previous-month"
              type="button"
              aria-label="Previous month"
              class="
                rounded-lg border border-slate-300
                px-3 py-2
                text-sm font-medium
                hover:bg-slate-50
              "
            >
              ←
            </button>

            <h2
              id="calendar-heading"
              class="text-lg font-semibold"
            >
              August 2026
            </h2>

            <button
              id="next-month"
              type="button"
              aria-label="Next month"
              class="
                rounded-lg border border-slate-300
                px-3 py-2
                text-sm font-medium
                hover:bg-slate-50
              "
            >
              →
            </button>
          </div>


          <!-- Weekday headings -->
          <div
            class="
              grid grid-cols-7
              border-b border-slate-200
              bg-slate-50
              text-center
              text-xs font-semibold
              uppercase
              text-slate-500
            "
          >
            <div class="py-3">Sun</div>
            <div class="py-3">Mon</div>
            <div class="py-3">Tue</div>
            <div class="py-3">Wed</div>
            <div class="py-3">Thu</div>
            <div class="py-3">Fri</div>
            <div class="py-3">Sat</div>
          </div>


          <!--
            JavaScript will eventually generate these cells.
            For now they are placeholders so we can establish
            the responsive design.
          -->
          <div
            id="calendar-grid"
            class="grid grid-cols-7 divide-x divide-y divide-slate-200">
          </div>
        </section>


        <!-- ====================================
             EARNINGS SETTINGS
        ===================================== -->
        <aside class="space-y-4">

          <section
            class="
              rounded-xl border border-slate-200
              bg-white p-5 shadow-sm
            "
          >
            <h2 class="font-semibold">
              Earnings Settings
            </h2>

            <div class="mt-5 space-y-4">

              <!-- Hourly rate -->
              <div>
                <label
                  for="hourly-rate"
                  class="block text-sm font-medium text-slate-700"
                >
                  Hourly Rate
                </label>

                <div class="relative mt-1">
                  <span
                    class="
                      pointer-events-none absolute
                      left-3 top-1/2
                      -translate-y-1/2
                      text-slate-500
                    "
                  >
                    $
                  </span>

                  <input
                    id="hourly-rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value="25"
                    class="
                      w-full rounded-lg
                      border border-slate-300
                      py-2 pl-7 pr-3
                      outline-none
                      focus:border-slate-500
                    "
                  />
                </div>
              </div>


              <!-- Regular hours -->
              <div>
                <label
                  for="regular-hours"
                  class="block text-sm font-medium text-slate-700"
                >
                  Regular Hours / Week
                </label>

                <input
                  id="regular-hours"
                  type="number"
                  min="0"
                  value="40"
                  class="
                    mt-1 w-full rounded-lg
                    border border-slate-300
                    px-3 py-2
                    outline-none
                    focus:border-slate-500
                  "
                />
              </div>


              <!-- OT multiplier -->
              <div>
                <label
                  for="overtime-multiplier"
                  class="block text-sm font-medium text-slate-700"
                >
                  Overtime Multiplier
                </label>

                <input
                  id="overtime-multiplier"
                  type="number"
                  min="1"
                  step="0.1"
                  value="1.5"
                  class="
                    mt-1 w-full rounded-lg
                    border border-slate-300
                    px-3 py-2
                    outline-none
                    focus:border-slate-500
                  "
                />
              </div>

            </div>
          </section>


          <!-- Calendar legend -->
          <section
            class="
              rounded-xl border border-slate-200
              bg-white p-5 shadow-sm
            "
          >
            <h2 class="font-semibold">
              Calendar
            </h2>

            <div class="mt-4 space-y-3 text-sm">

              <div class="flex items-center gap-3">
                <span
                  class="h-3 w-3 rounded-full bg-blue-500"
                ></span>
                Work Shift
              </div>

              <div class="flex items-center gap-3">
                <span
                  class="h-3 w-3 rounded-full bg-emerald-500"
                ></span>
                Income
              </div>

              <div class="flex items-center gap-3">
                <span
                  class="h-3 w-3 rounded-full bg-red-500"
                ></span>
                Expense
              </div>

              <div class="flex items-center gap-3">
                <span
                  class="h-3 w-3 rounded-full bg-violet-500"
                ></span>
                Payday
              </div>

            </div>
          </section>

        </aside>
      </div>

    </main>
  </div>
`;

initializeCalendar();
