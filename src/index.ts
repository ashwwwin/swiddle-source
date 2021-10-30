import './pre-start' // Must be the first import
import http from '@/Core/Server'
import logger from '@/shared/Logger'
import Socket from "@/Core/Socket"

// Start the server
const port = Number(process.env.PORT || 3000)
http.listen(port, () => {
  logger.info('Express server started on port: ' + port)
})
Socket.boot(http)