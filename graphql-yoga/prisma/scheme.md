```mermaid
erDiagram

  Link {
      Int id
    DateTime createdAt
    String description
    String url
    }
  

  Comment {
      Int id
    String body
    }
  
    Comment o{--|| Link : "link"
```
