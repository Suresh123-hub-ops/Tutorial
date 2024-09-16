const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const addDays = require('date-fns/addDays')

const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'todoApplication.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

const convertDbObjectToResponseObject = dbObject => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    duedate: dbObject.due_date,
  }
}

const hasPriorityAndStatusProperties = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

const hasSearch_qProperty = requestQuery => {
  return requestQuery.search_q !== undefined
}

const hasCategoryAndStatusProperty = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryProperty = requestQuery => {
  return requestQuery.category !== undefined
}

const hasCategoryAndPriorityProperty = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  )
}

// Get todo's API
app.get('/todos/', async (request, response) => {
  let data = null
  let getTodosQuery = ''
  const {search_q = '', priority, status, category} = request.query

  switch (true) {
    case hasPriorityAndStatusProperties(request.query): //if this is true then below query is taken in the code
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND status = '${status}'
    AND priority = '${priority}';`

      break

    case hasPriorityProperty(request.query):
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND priority = '${priority}';`
      data = await db.all(getTodosQuery)
      if (data === undefined) {
        response.status(400)
        response.send('Invalid Todo Priority')
      } else {
        response.send(data)
        break
      }

    case hasStatusProperty(request.query):
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND status = '${status}';`
      data = await db.all(getTodosQuery)
      if (data === undefined) {
        response.status(400)
        response.send('Invalid Todo Status')
      } else {
        response.send(data)
        break
      }
    case hasSearch_qProperty(request.query):
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'`
      break
    case hasCategoryAndStatusProperty(request.query):
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND status = '${status}'
    AND category = '${category}';`
      break
    case hasCategoryProperty(request.query):
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND category = '${category}';`
      data = await db.all(getTodosQuery)
      if (data === undefined) {
        response.status(400)
        response.send('Invalid Todo Category')
      } else {
        response.send(data)
        break
      }
    case hasCategoryAndPriorityProperty(request.query):
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%'
    AND priority = '${priority}'
    AND category = '${category}';`

    default:
      getTodosQuery = `
   SELECT
    *
   FROM
    todo 
   WHERE
    todo LIKE '%${search_q}%';`
  }

  data = await db.all(getTodosQuery)
  response.send(data)
})

//get a todo based on todo_id
app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const gettodoQuery = `
    SELECT
        *
    FROM
       todo
    WHERE
        id = ${todoId};`
  const todo_data = await db.get(gettodoQuery)
  response.send(convertDbObjectToResponseObject(todo_data))
})
//get todo on duedate

app.get('/agenda/', async (request, response) => {
  const {dueDate} = request.params
  const gettodoQuery = `
    SELECT
        *
    FROM
       todo
    WHERE
        due_date = ${dueDate};`
  const todo_data = await db.get(gettodoQuery)
  if (todo_data === undefined) {
    response.status(400)
    response.send('Invalid Due Date')
  } else {
    response.send(convertDbObjectToResponseObject(todo_data))
  }
})

//update player
app.post('/todos/', async (request, response) => {
  const todoDetails = request.body
  const {id, todo, priority, status, category, duedate} = todoDetails

  const addtodoQuery = `
    INSERT INTO
      todo(id,todo,priority,status,category,due_date)
     VALUES
      (
         ${id},
        '${todo}',
        '${priority}',
        '${status}',
        '${category}',
         ${duedate}
      );`
  const dbResponse = await db.run(addtodoQuery)
  response.send('Todo Successfully Added')
})

//update player details
app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  let updateColumn = ''
  const requestBody = request.body
  switch (true) {
    case requestBody.status != undefined:
      updateColumn = 'status'
      break
    case requestBody.priority != undefined:
      updateColumn = 'priority'
      break
    case requestBody.todo != undefined:
      updateColumn = 'todo'
      break
    case requestBody.category != undefined:
      updateColumn = 'category'
      break
    case requestBody.dueDate != undefined:
      updateColumn = 'due_date'
      break
  }

  const previousTodoQuery = `
    SELECT 
    * 
    From 
     todo 
    WHERE
      id = ${todoId};`
  const previousTodo = await db.get(previousTodoQuery)
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    due_date = previousTodo.due_date,
  } = request.body
  const updateTodoQuery = `
  UPDATE
  todo 
  SET 
  todo='${todo}',
  priority='${priority}',
  status='${status}',
  category='${category}',
  due_date=${due_date}
  where
  id=${todoId};`
  await db.run(updateTodoQuery)
  response.send(`${updateColumn} Updated`)
})

//Delete player
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deletetodoQuery = `
    DELETE FROM
       todo
    WHERE
        id = ${todoId};`
  await db.run(deletetodoQuery)
  response.send('Todo Deleted')
})
module.exports = app
