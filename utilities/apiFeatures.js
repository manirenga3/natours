export class ApiFeatures {
  constructor(query, queryObject) {
    (this.query = query), (this.queryObject = queryObject);
  }

  filter() {
    const queryObjCopy = { ...this.queryObject };
    const excludedFields = ['sort', 'fields', 'page', 'limit'];
    excludedFields.forEach((el) => delete queryObjCopy[el]);

    let queryStr = JSON.stringify(queryObjCopy);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryObject.sort) {
      const sortBy = this.queryObject.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-ratingsAverage');
    }

    return this;
  }

  limitFields() {
    if (this.queryObject.fields) {
      const fields = this.queryObject.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryObject.page || 1;
    const limit = this.queryObject.limit || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
