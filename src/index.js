const express = require('express');
const { v4: uuidv4 }= require('uuid');

const app = express();

app.use(express.json());

app.listen(3333);

const customers = [];

//Middleware Verificação se Existe Account
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if(!customer) return response.status(400).json({ error: 'Customer not found!' });

  request.customer = customer;

  return next();
};

function getBalance(statement) {
  const balance = statement.reduce(( accumulator, operation ) => {
    if(operation.type === 'credit') {
      return accumulator + operation.amount;
    } else {
      return accumulator - operation.amount;
    }
  }, 0);

  return balance;
}

app.patch('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;
  
  customer.name = name;

  return response.status(201).send();
});

app.post('/account', (request, response) => {
  const { name, cpf } = request.body;
  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if(customerAlreadyExists) return response.status(400).json({ error: 'Customer already Exists!' });

  customers.push({
    id: uuidv4(),
    cpf,
    name,
    statement: []
  });

  return response.status(201).send();
});

app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
  const { amount, description } = request.body;
  const { customer } = request;
  const statementOperation = {
    amount,
    description,
    createdAt: new Date(),
    type: "credit",
  }

  customer.statement.push(statementOperation);

  return response.status(201).json({ message: `Deposit successful! Amount > ${amount}`});
});

app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;
  const balance = getBalance(customer.statement);

  if(balance < amount) return response.status(400).json({ error: 'Insufficient Funds!'});

  const statementOperation = {
    amount,
    createdAt: new Date(),
    type: "debit",
  }

  customer.statement.push(statementOperation);

  return response.status(201).json({ message: `Withdraw successful! Amount > ${amount}`});
});

app.get('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer);
});

app.get('/balance', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const balance = getBalance(customer.statement);

  return response.json({ message: `Your Balance: $${balance}`});
});

app.get('/statement', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  return response.status(200).json(customer.statement);
});

app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;
  const dateFormat = new Date(date + ' 00:00');
  const statement = customer.statement.filter(
    (statement) => statement.createdAt.toDateString() === new Date(dateFormat).toDateString()
  );

  return response.status(200).json(statement);
});

app.delete('/account', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(204).send();
});
